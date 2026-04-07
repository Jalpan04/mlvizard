import torch
import torch.nn as nn
from typing import List


class LinearRegressionModel(nn.Module):
    def __init__(self, input_dim: int, output_dim: int = 1):
        super().__init__()
        self.layer = nn.Linear(input_dim, output_dim)

    def forward(self, x):
        return self.layer(x)


class LogisticRegressionModel(nn.Module):
    def __init__(self, input_dim: int, output_dim: int = 1):
        super().__init__()
        self.layer = nn.Linear(input_dim, output_dim)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        return self.sigmoid(self.layer(x))


class MLP(nn.Module):
    def __init__(
        self,
        input_dim: int,
        hidden_dims: List[int],
        output_dim: int,
        activation: str = "relu",
        output_activation: str = "softmax",
    ):
        super().__init__()
        act_map = {
            "relu": nn.ReLU,
            "tanh": nn.Tanh,
            "sigmoid": nn.Sigmoid,
            "leaky_relu": nn.LeakyReLU,
        }
        ActClass = act_map.get(activation.lower(), nn.ReLU)

        layers = []
        prev = input_dim
        for h in hidden_dims:
            layers.append(nn.Linear(prev, h))
            layers.append(ActClass())
            prev = h
        layers.append(nn.Linear(prev, output_dim))
        self.net = nn.Sequential(*layers)
        self.output_activation = output_activation.lower()
        self.output_dim = output_dim

    def forward(self, x):
        out = self.net(x)
        if self.output_activation == "softmax" and self.output_dim > 1:
            return torch.softmax(out, dim=-1)
        if self.output_activation == "sigmoid":
            return torch.sigmoid(out)
        return out


def build_model(config: dict, input_dim: int) -> nn.Module:
    """
    config keys:
      model_type: linear | logistic | neural_network
      neurons: [4, 6, 3]        (for MLP hidden + output)
      activation: relu | tanh | sigmoid | leaky_relu
      output_activation: softmax | sigmoid | none
      output_dim: int
    """
    model_type = config.get("model_type", "neural_network").lower()
    output_dim = int(config.get("output_dim", 1))

    if model_type == "linear":
        return LinearRegressionModel(input_dim, output_dim)

    if model_type == "logistic":
        return LogisticRegressionModel(input_dim, output_dim)

    # neural_network / MLP
    neurons = config.get("neurons", [8, 8])
    if not neurons:
        neurons = [8, 8]
    hidden_dims = neurons
    out_dim = output_dim

    return MLP(
        input_dim=input_dim,
        hidden_dims=hidden_dims,
        output_dim=out_dim,
        activation=config.get("activation", "relu"),
        output_activation=config.get("output_activation", "softmax"),
    )
