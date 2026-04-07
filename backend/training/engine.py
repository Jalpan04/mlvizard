import asyncio
import io
import os
import uuid
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.preprocessing import StandardScaler, LabelEncoder

from training.models import build_model
from websocket.manager import manager

SAVED_MODELS_DIR = Path("saved_models")
SAVED_MODELS_DIR.mkdir(exist_ok=True)

# Per-session state
_sessions: dict = {}


def _extract_weights(model: nn.Module) -> list:
    """Collect all weight tensors as nested lists (float16 to save bandwidth)."""
    result = []
    for name, param in model.named_parameters():
        if "weight" in name:
            w = param.detach().cpu().to(torch.float16).numpy().tolist()
            result.append({"name": name, "values": w})
    return result


def _extract_activations(model: nn.Module, x: torch.Tensor) -> list:
    """
    Run a single forward pass while capturing per-layer output magnitudes.
    Returns list of mean absolute activation per layer.
    """
    activations = []
    hooks = []

    def make_hook(layer_idx):
        def hook(module, inp, output):
            if isinstance(output, torch.Tensor):
                vals = output.detach().cpu().float().numpy()
                # mean abs activation per neuron in this layer
                per_neuron = np.mean(np.abs(vals), axis=0).tolist()
                activations.append({"layer": layer_idx, "values": per_neuron})
        return hook

    idx = 0
    for module in model.modules():
        if isinstance(module, (nn.Linear, nn.ReLU, nn.Tanh, nn.Sigmoid)):
            hooks.append(module.register_forward_hook(make_hook(idx)))
            idx += 1

    with torch.no_grad():
        sample = x[:32] if x.shape[0] > 32 else x
        model(sample)

    for h in hooks:
        h.remove()

    return activations


def _build_loss_fn(config: dict) -> nn.Module:
    model_type = config.get("model_type", "neural_network").lower()
    output_dim = int(config.get("output_dim", 1))
    if model_type == "linear":
        return nn.MSELoss()
    if model_type == "logistic" or output_dim == 1:
        return nn.BCEWithLogitsLoss()
    return nn.CrossEntropyLoss()


def get_session(session_id: str) -> Optional[dict]:
    return _sessions.get(session_id)


def create_session(
    session_id: str,
    df: pd.DataFrame,
    config: dict,
    target_col: str,
) -> dict:
    """Preprocess data and build model for a session."""
    feature_cols = [c for c in df.columns if c != target_col]
    X = df[feature_cols].values.astype(np.float32)
    y_raw = df[target_col].values

    # Encode target
    le = LabelEncoder()
    output_dim = config.get("output_dim", None)
    model_type = config.get("model_type", "neural_network").lower()

    if model_type == "linear":
        y = y_raw.astype(np.float32).reshape(-1, 1)
        if output_dim is None:
            config["output_dim"] = 1
    else:
        y_enc = le.fit_transform(y_raw)
        n_classes = len(le.classes_)
        if n_classes == 2:
            y = y_enc.astype(np.float32).reshape(-1, 1)
            config["output_dim"] = 1
        else:
            y = y_enc.astype(np.int64)
            config["output_dim"] = n_classes

    scaler = StandardScaler()
    X = scaler.fit_transform(X)

    X_t = torch.tensor(X, dtype=torch.float32)
    y_t = (
        torch.tensor(y, dtype=torch.float32)
        if model_type != "neural_network" or config["output_dim"] == 1
        else torch.tensor(y, dtype=torch.long)
    )

    model = build_model(config, input_dim=X.shape[1])
    optimizer = torch.optim.Adam(
        model.parameters(),
        lr=float(config.get("learning_rate", 0.01)),
    )
    loss_fn = _build_loss_fn(config)

    session = {
        "model": model,
        "optimizer": optimizer,
        "loss_fn": loss_fn,
        "X": X_t,
        "y": y_t,
        "config": config,
        "epoch": 0,
        "step": 0,
        "loss_history": [],
        "paused": asyncio.Event(),
        "stop_flag": False,
        "task": None,
        "feature_cols": feature_cols,
        "target_col": target_col,
        "label_encoder": le,
        "delay": 0.05,
        "stream_every": 5,
    }
    session["paused"].set()  # not paused initially
    _sessions[session_id] = session
    return session


def remove_session(session_id: str) -> None:
    _sessions.pop(session_id, None)


async def run_training(session_id: str, stream_every: int = 5, delay: float = 0.05) -> None:
    session = _sessions.get(session_id)
    if not session:
        return

    model: nn.Module = session["model"]
    optimizer = session["optimizer"]
    loss_fn = session["loss_fn"]
    X: torch.Tensor = session["X"]
    y: torch.Tensor = session["y"]
    config = session["config"]
    # Initialize from request
    session["delay"] = delay
    session["stream_every"] = stream_every
    
    epochs = int(config.get("epochs", 50))
    batch_size = int(config.get("batch_size", 32))
    n = X.shape[0]

    model.train()

    for epoch in range(epochs):
        if session["stop_flag"]:
            break

        # Shuffle
        perm = torch.randperm(n)
        X_shuf = X[perm]
        y_shuf = y[perm]

        epoch_loss = 0.0
        num_batches = 0

        for start in range(0, n, batch_size):
            # Pause support
            await session["paused"].wait()
            if session["stop_flag"]:
                break

            Xb = X_shuf[start : start + batch_size]
            yb = y_shuf[start : start + batch_size]

            optimizer.zero_grad()
            out = model(Xb)

            # Shape alignment
            if isinstance(loss_fn, nn.CrossEntropyLoss):
                loss = loss_fn(out, yb)
            else:
                loss = loss_fn(out, yb.view_as(out) if yb.dim() < out.dim() else yb)

            loss.backward()
            optimizer.step()

            epoch_loss += loss.item()
            num_batches += 1
            session["step"] += 1

            # Stream snapshot every N steps
            stream_every = session.get("stream_every", 5)
            if session["step"] % stream_every == 0:
                activations = _extract_activations(model, Xb)
                weights = _extract_weights(model)
                snapshot = {
                    "type": "snapshot",
                    "epoch": epoch + 1,
                    "step": session["step"],
                    "loss": round(loss.item(), 6),
                    "weights": weights,
                    "activations": activations,
                }
                await manager.send(session_id, snapshot)
                session["loss_history"].append(loss.item())

            await asyncio.sleep(session.get("delay", 0.05))  # yield to event loop and control speed

        avg_loss = epoch_loss / max(num_batches, 1)
        session["epoch"] = epoch + 1

        # Send epoch summary
        await manager.send(
            session_id,
            {
                "type": "epoch_end",
                "epoch": epoch + 1,
                "avg_loss": round(avg_loss, 6),
                "total_epochs": epochs,
            },
        )

    # Training complete
    session["stop_flag"] = True
    await manager.send(
        session_id,
        {"type": "training_complete", "total_steps": session["step"]},
    )


def save_model(session_id: str) -> Optional[Path]:
    session = _sessions.get(session_id)
    if not session:
        return None
    path = SAVED_MODELS_DIR / f"{session_id}.pt"
    torch.save(
        {
            "model_state": session["model"].state_dict(),
            "config": session["config"],
        },
        path,
    )
    return path
