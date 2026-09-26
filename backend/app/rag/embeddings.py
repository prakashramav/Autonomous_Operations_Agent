import logging
import hashlib
import numpy as np
from typing import List, Optional
from app.services.gemini_client import gemini_service

logger = logging.getLogger(__name__)

EMBEDDING_MODEL = "models/gemini-embedding-001"
EMBEDDING_DIM = 3072

class EmbeddingService:
    def __init__(self):
        self.model = EMBEDDING_MODEL
        self.dimension = EMBEDDING_DIM

    def _fallback_embedding(self, text: str) -> List[float]:
        """
        Deterministic, word-sensitive fallback embedding vector of dimension 3072.
        Ensures consistent cosine similarity ranking if Gemini embedding API is rate-limited.
        """
        words = text.lower().split()
        vec = np.zeros(self.dimension, dtype=np.float32)
        
        for i, word in enumerate(words):
            # Seed reproducible pseudo-random features per word
            h = int(hashlib.sha256(word.encode("utf-8")).hexdigest()[:8], 16)
            np.random.seed(h)
            word_vec = np.random.randn(self.dimension).astype(np.float32)
            # Weight earlier tokens slightly higher
            decay = 1.0 / (1.0 + 0.05 * i)
            vec += word_vec * decay

        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        else:
            vec[0] = 1.0
        return vec.tolist()

    async def get_embedding(self, text: str) -> List[float]:
        """Generates embedding using Gemini embedding model, with robust fallback."""
        if not text or not text.strip():
            return [0.0] * self.dimension

        if gemini_service.is_configured() and gemini_service.client is not None:
            try:
                res = await gemini_service.client.aio.models.embed_content(
                    model=self.model,
                    contents=text.strip()
                )
                if hasattr(res, "embeddings") and len(res.embeddings) > 0:
                    values = list(res.embeddings[0].values)
                    return values
            except Exception as e:
                logger.warning(f"Gemini API embedding fallback triggered for text snippet: {e}")

        return self._fallback_embedding(text)

    def cosine_similarity(self, vec_a: List[float], vec_b: List[float]) -> float:
        """Computes cosine similarity between two embedding vectors."""
        a = np.array(vec_a, dtype=np.float32)
        b = np.array(vec_b, dtype=np.float32)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))

embedding_service = EmbeddingService()
