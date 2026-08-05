import json, pickle
import numpy as np
import faiss
import torch

import sys
from unittest.mock import MagicMock
from importlib.machinery import ModuleSpec

datasets_mock = MagicMock()
datasets_mock.__spec__ = ModuleSpec(name='datasets', loader=MagicMock())
sys.modules['datasets'] = datasets_mock

pyarrow_mock = MagicMock()
pyarrow_mock.__spec__ = ModuleSpec(name='pyarrow', loader=MagicMock())
sys.modules['pyarrow'] = pyarrow_mock

from django.conf import settings
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from FlagEmbedding import BGEM3FlagModel

RERANKER_NAME = "BAAI/bge-reranker-v2-m3"

_state = {}  # lazy singleton, loaded once per process


def _load():
    if _state:
        return _state
    device = settings.GEONEXUS_DEVICE

    faiss_index = faiss.read_index(f"{settings.CHATBOT_DIR}/faiss_dense.index")
    with open(f"{settings.CHATBOT_DIR}/bm25_index.pkl", "rb") as f:
        bm25_index = pickle.load(f)
    with open(f"{settings.CHATBOT_DIR}/chunks.json") as f:
        chunks = json.load(f)

    embedder = BGEM3FlagModel("BAAI/bge-m3", use_fp16=(device == "cuda"), device=device)

    reranker_tokenizer = AutoTokenizer.from_pretrained(RERANKER_NAME)
    reranker_model = AutoModelForSequenceClassification.from_pretrained(RERANKER_NAME)
    reranker_model.to(device)
    reranker_model.eval()
    if device == "cuda":
        reranker_model.half()

    _state.update(dict(faiss_index=faiss_index, bm25_index=bm25_index, chunks=chunks,
                        embedder=embedder, reranker_tokenizer=reranker_tokenizer,
                        reranker_model=reranker_model, device=device))
    return _state


@torch.no_grad()
def rerank_score(pairs, batch_size=16, max_length=512):
    s = _load()
    scores = []
    for i in range(0, len(pairs), batch_size):
        batch = pairs[i:i + batch_size]
        queries = [p[0] for p in batch]
        passages = [p[1] for p in batch]
        inputs = s["reranker_tokenizer"](queries, passages, padding=True, truncation=True,
                                          max_length=max_length, return_tensors="pt").to(s["device"])
        logits = s["reranker_model"](**inputs).logits.view(-1).float()
        scores.extend(torch.sigmoid(logits).cpu().tolist())
    return scores


def dense_search(query, top_k=40):
    s = _load()
    q_out = s["embedder"].encode([query], return_dense=True, return_sparse=False, return_colbert_vecs=False)
    q_vec = q_out["dense_vecs"].astype("float32")
    faiss.normalize_L2(q_vec)
    scores, idxs = s["faiss_index"].search(q_vec, top_k)
    return list(zip(idxs[0].tolist(), scores[0].tolist()))


def bm25_search(query, top_k=40):
    s = _load()
    scores = s["bm25_index"].get_scores(query.lower().split())
    top_idx = np.argsort(scores)[::-1][:top_k]
    return [(int(i), float(scores[i])) for i in top_idx]


def rrf_fuse(dense_results, bm25_results, k=60):
    fused = {}
    for rank, (idx, _) in enumerate(dense_results):
        fused[idx] = fused.get(idx, 0.0) + 1.0 / (k + rank + 1)
    for rank, (idx, _) in enumerate(bm25_results):
        fused[idx] = fused.get(idx, 0.0) + 1.0 / (k + rank + 1)
    return sorted(fused.items(), key=lambda x: -x[1])


def hybrid_retrieve(query, doc_type_filter=None, industry_filter=None, candidate_k=40, final_k=6):
    s = _load()
    chunks = s["chunks"]
    dense_r = dense_search(query, candidate_k)
    bm25_r = bm25_search(query, candidate_k)
    fused = rrf_fuse(dense_r, bm25_r)

    candidates = []
    for idx, _ in fused:
        c = chunks[idx]
        if doc_type_filter and c["doc_type"] not in doc_type_filter:
            continue
        if industry_filter and c["industries"] and industry_filter not in c["industries"]:
            continue
        candidates.append(c)
        if len(candidates) >= candidate_k:
            break
    if not candidates:
        return []

    pairs = [[query, c["text"]] for c in candidates]
    rerank_scores = rerank_score(pairs)
    ranked = sorted(zip(candidates, rerank_scores), key=lambda x: -x[1])
    return [c for c, _ in ranked[:final_k]]