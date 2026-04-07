import asyncio
import json
import requests
import websockets

async def test_flow():
    print("Uploading...")
    with open("test_data_moons.csv", "rb") as f:
        res = requests.post("http://localhost:8000/upload", files={"file": f})
    data = res.json()
    print("Upload response:", data)
    session_id = data["session_id"]
    
    print("Starting train...")
    config = {
        "model_type": "neural_network",
        "layers": 2,
        "neurons": [8, 4],
        "activation": "relu",
        "output_activation": "softmax",
        "epochs": 10,
        "learning_rate": 0.01,
        "batch_size": 32,
        "stream_every": 5
    }
    payload = {
        "session_id": session_id,
        "target_col": "label",
        "config": config,
        "stream_every": 5,
        "delay": 0.2  # Test with 200ms delay per step
    }
    start_res = requests.post("http://localhost:8000/train/start", json=payload)
    print("Start training response:", start_res.json())
    
    print("Connecting WS...")
    uri = f"ws://localhost:8000/ws/{session_id}"
    try:
        async with websockets.connect(uri) as ws:
            while True:
                msg = await ws.recv()
                msg_data = json.loads(msg)
                print("WS msg:", msg_data.get("type"), msg_data.get("epoch"), msg_data.get("step"))
                if msg_data.get("type") == "error" or msg_data.get("type") == "training_complete":
                    print("DONE", msg_data.get("type"))
                    break
    except Exception as e:
        print("WS Exception:", e)

if __name__ == "__main__":
    asyncio.run(test_flow())
