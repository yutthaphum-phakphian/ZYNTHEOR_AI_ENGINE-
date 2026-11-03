"""Small byte-level decoder-only Transformer for ZYNTHEOR CORE_NATIVE research.

This model is initialized from a deterministic random seed and never loads a
third-party checkpoint. It is a research bootstrap, not a production model.
"""
from __future__ import annotations
import math
import torch
from torch import nn

PAD_ID = 256
BOS_ID = 257
EOS_ID = 258
VOCAB_SIZE = 259


def encode_bytes(text: str, add_bos: bool = True, add_eos: bool = True) -> list[int]:
    ids = list(text.encode("utf-8", errors="strict"))
    return ([BOS_ID] if add_bos else []) + ids + ([EOS_ID] if add_eos else [])


def decode_bytes(ids: list[int]) -> str:
    raw = bytes(x for x in ids if 0 <= x <= 255)
    return raw.decode("utf-8", errors="replace")


class CausalSelfAttention(nn.Module):
    def __init__(self, width: int, heads: int, context: int):
        super().__init__()
        if width % heads:
            raise ValueError("d_model must be divisible by n_heads")
        self.heads = heads
        self.head_dim = width // heads
        self.qkv = nn.Linear(width, width * 3, bias=False)
        self.proj = nn.Linear(width, width, bias=False)
        self.register_buffer("causal_mask", torch.tril(torch.ones(context, context, dtype=torch.bool)), persistent=False)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        batch, length, width = x.shape
        q, k, v = self.qkv(x).chunk(3, dim=-1)
        def split(t: torch.Tensor) -> torch.Tensor:
            return t.view(batch, length, self.heads, self.head_dim).transpose(1, 2)
        q, k, v = split(q), split(k), split(v)
        scores = (q @ k.transpose(-2, -1)) / math.sqrt(self.head_dim)
        scores = scores.masked_fill(~self.causal_mask[:length, :length], torch.finfo(scores.dtype).min)
        weights = torch.softmax(scores, dim=-1)
        out = (weights @ v).transpose(1, 2).contiguous().view(batch, length, width)
        return self.proj(out)


class TransformerBlock(nn.Module):
    def __init__(self, width: int, heads: int, context: int, mlp_ratio: int = 4):
        super().__init__()
        self.norm1 = nn.LayerNorm(width)
        self.attn = CausalSelfAttention(width, heads, context)
        self.norm2 = nn.LayerNorm(width)
        self.mlp = nn.Sequential(nn.Linear(width, width * mlp_ratio), nn.GELU(), nn.Linear(width * mlp_ratio, width))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = x + self.attn(self.norm1(x))
        return x + self.mlp(self.norm2(x))


class ZyntheorNativeCPU(nn.Module):
    def __init__(self, d_model: int = 256, n_layers: int = 6, n_heads: int = 4, context: int = 256):
        super().__init__()
        self.context = context
        self.token_embedding = nn.Embedding(VOCAB_SIZE, d_model)
        self.position_embedding = nn.Embedding(context, d_model)
        self.blocks = nn.ModuleList([TransformerBlock(d_model, n_heads, context) for _ in range(n_layers)])
        self.final_norm = nn.LayerNorm(d_model)
        self.lm_head = nn.Linear(d_model, VOCAB_SIZE, bias=False)
        self.lm_head.weight = self.token_embedding.weight

    def forward(self, input_ids: torch.Tensor) -> torch.Tensor:
        _, length = input_ids.shape
        if length > self.context:
            raise ValueError(f"sequence length {length} exceeds context {self.context}")
        positions = torch.arange(length, device=input_ids.device).unsqueeze(0)
        x = self.token_embedding(input_ids) + self.position_embedding(positions)
        for block in self.blocks:
            x = block(x)
        return self.lm_head(self.final_norm(x))


def count_parameters(model: nn.Module) -> int:
    return sum(p.numel() for p in model.parameters() if p.requires_grad)
