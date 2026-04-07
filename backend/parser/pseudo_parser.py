"""
Pseudo-language parser for MLVizard.

Supported syntax:
    DATASET train.csv

    MODEL neural_network | linear | logistic
    LAYERS 3
    NEURONS [4, 6, 3]

    ACTIVATION relu | tanh | sigmoid | leaky_relu
    OUTPUT softmax | sigmoid | none

    TRAIN
    EPOCHS 50
    LEARNING_RATE 0.01
    BATCH_SIZE 32
    STREAM_EVERY 5
"""

import re
from typing import Any, Dict


class ParseError(Exception):
    pass


def parse_pseudo(code: str) -> Dict[str, Any]:
    """
    Parse pseudo-language code into a training config dict.
    Returns:
        {
          dataset: str,
          model_type: str,
          layers: int,
          neurons: list[int],
          activation: str,
          output_activation: str,
          epochs: int,
          learning_rate: float,
          batch_size: int,
          stream_every: int,
        }
    """
    config: Dict[str, Any] = {
        "dataset": None,
        "model_type": "neural_network",
        "layers": 2,
        "neurons": [8, 4],
        "activation": "relu",
        "output_activation": "softmax",
        "epochs": 50,
        "learning_rate": 0.01,
        "batch_size": 32,
        "stream_every": 5,
    }

    lines = [l.strip() for l in code.strip().splitlines()]
    in_train_block = False

    for line in lines:
        if not line or line.startswith("#"):
            continue

        upper = line.upper()

        if upper.startswith("DATASET"):
            rest = line[len("DATASET"):].strip()
            config["dataset"] = rest

        elif upper.startswith("MODEL"):
            val = line[len("MODEL"):].strip().lower()
            if val not in ("neural_network", "linear", "logistic"):
                raise ParseError(
                    f"Unknown model type '{val}'. Use: neural_network, linear, logistic"
                )
            config["model_type"] = val

        elif upper.startswith("LAYERS"):
            val = line[len("LAYERS"):].strip()
            try:
                config["layers"] = int(val)
            except ValueError:
                raise ParseError(f"LAYERS must be an integer, got '{val}'")

        elif upper.startswith("NEURONS"):
            val = line[len("NEURONS"):].strip()
            # Accept [4, 6, 3] or 4 6 3
            nums = re.findall(r"\d+", val)
            if not nums:
                raise ParseError(f"NEURONS must be a list of integers, got '{val}'")
            config["neurons"] = [int(n) for n in nums]

        elif upper.startswith("ACTIVATION"):
            val = line[len("ACTIVATION"):].strip().lower()
            valid = ("relu", "tanh", "sigmoid", "leaky_relu")
            if val not in valid:
                raise ParseError(f"ACTIVATION must be one of {valid}, got '{val}'")
            config["activation"] = val

        elif upper.startswith("OUTPUT"):
            val = line[len("OUTPUT"):].strip().lower()
            config["output_activation"] = val

        elif upper == "TRAIN":
            in_train_block = True

        elif upper.startswith("EPOCHS"):
            val = line[len("EPOCHS"):].strip()
            try:
                config["epochs"] = int(val)
            except ValueError:
                raise ParseError(f"EPOCHS must be an integer, got '{val}'")

        elif upper.startswith("LEARNING_RATE"):
            val = line[len("LEARNING_RATE"):].strip()
            try:
                config["learning_rate"] = float(val)
            except ValueError:
                raise ParseError(f"LEARNING_RATE must be a float, got '{val}'")

        elif upper.startswith("BATCH_SIZE"):
            val = line[len("BATCH_SIZE"):].strip()
            try:
                config["batch_size"] = int(val)
            except ValueError:
                raise ParseError(f"BATCH_SIZE must be an integer, got '{val}'")

        elif upper.startswith("STREAM_EVERY"):
            val = line[len("STREAM_EVERY"):].strip()
            try:
                config["stream_every"] = int(val)
            except ValueError:
                raise ParseError(f"STREAM_EVERY must be an integer, got '{val}'")

        else:
            # Unknown keyword — warn but continue
            pass

    return config
