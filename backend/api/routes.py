import asyncio
import io
import uuid
from pathlib import Path
from typing import Optional

import pandas as pd
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from pydantic import BaseModel

from parser.pseudo_parser import parse_pseudo, ParseError
from training.engine import (
    create_session,
    get_session,
    remove_session,
    run_training,
    save_model,
)
from websocket.manager import manager

router = APIRouter()

# ─── CSV Upload ───────────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(400, "Only CSV files are supported.")
    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(400, f"Failed to parse CSV: {e}")

    # Store temporarily keyed by a new session ID (upload stage)
    session_id = str(uuid.uuid4())

    # Save to disk so we can re-read during train start
    tmp_path = Path("tmp_uploads")
    tmp_path.mkdir(exist_ok=True)
    csv_path = tmp_path / f"{session_id}.csv"
    csv_path.write_bytes(content)

    return {
        "session_id": session_id,
        "columns": list(df.columns),
        "rows": len(df),
        "preview": df.head(5).to_dict(orient="records"),
        "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
    }


# ─── Parse Pseudo-Language ────────────────────────────────────────────────────

class ParseRequest(BaseModel):
    code: str


@router.post("/parse")
async def parse_code(body: ParseRequest):
    try:
        config = parse_pseudo(body.code)
        return {"config": config, "errors": []}
    except ParseError as e:
        return {"config": None, "errors": [str(e)]}


# ─── Train Start ─────────────────────────────────────────────────────────────

class TrainRequest(BaseModel):
    session_id: str
    target_col: str
    config: dict          # from parser or form configurator
    stream_every: int = 5
    delay: float = 0.05


@router.post("/train/start")
async def train_start(body: TrainRequest):
    csv_path = Path("tmp_uploads") / f"{body.session_id}.csv"
    if not csv_path.exists():
        raise HTTPException(404, "Session not found. Please upload a CSV first.")

    df = pd.read_csv(csv_path)
    if body.target_col not in df.columns:
        raise HTTPException(400, f"Target column '{body.target_col}' not in dataset.")

    # Drop any prior session for this ID
    remove_session(body.session_id)

    session = create_session(
        session_id=body.session_id,
        df=df,
        config=body.config,
        target_col=body.target_col,
    )

    # Launch training as background task
    task = asyncio.create_task(
        run_training(
            body.session_id, 
            stream_every=body.stream_every,
            delay=body.delay
        )
    )
    
    def on_task_done(t):
        try:
            t.result()
        except Exception as e:
            import traceback
            traceback.print_exc()
            
    task.add_done_callback(on_task_done)
    session["task"] = task

    return {"status": "started", "session_id": body.session_id}


# ─── Pause / Resume ──────────────────────────────────────────────────────────

@router.post("/train/pause")
async def train_pause(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found.")
    session["paused"].clear()   # block the training loop
    return {"status": "paused"}


@router.post("/train/resume")
async def train_resume(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found.")
    session["paused"].set()     # unblock the training loop
    return {"status": "resumed"}


# ─── Stop ────────────────────────────────────────────────────────────────────

@router.post("/train/stop")
async def train_stop(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found.")
    session["stop_flag"] = True
    session["paused"].set()   # unblock so it can exit
    if session.get("task"):
        session["task"].cancel()
    return {"status": "stopped"}


@router.post("/train/update_speed")
async def update_speed(session_id: str, delay: float = 0.05, stream_every: int = 5):
    session = get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found.")
    
    session["delay"] = delay
    session["stream_every"] = stream_every
    return {"status": "updated", "delay": delay, "stream_every": stream_every}


# ─── Save Model ──────────────────────────────────────────────────────────────

@router.get("/train/save/{session_id}")
async def download_model(session_id: str):
    path = save_model(session_id)
    if not path:
        raise HTTPException(404, "Session not found or training not started.")
    return FileResponse(
        path=str(path),
        filename=f"mlvizard_model_{session_id[:8]}.pt",
        media_type="application/octet-stream",
    )


# ─── WebSocket ───────────────────────────────────────────────────────────────

@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await manager.connect(session_id, websocket)
    try:
        while True:
            # Keep alive — accept control messages (pause/resume/stop)
            data = await websocket.receive_json()
            action = data.get("action", "")
            session = get_session(session_id)

            if not session:
                await websocket.send_json({"type": "error", "msg": "No active session."})
                continue

            if action == "pause":
                session["paused"].clear()
                await websocket.send_json({"type": "status", "status": "paused"})
            elif action == "resume":
                session["paused"].set()
                await websocket.send_json({"type": "status", "status": "resumed"})
            elif action == "stop":
                session["stop_flag"] = True
                session["paused"].set()
                await websocket.send_json({"type": "status", "status": "stopped"})

    except WebSocketDisconnect:
        manager.disconnect(session_id)
