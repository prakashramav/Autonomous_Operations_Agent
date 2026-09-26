import os
import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
import numpy as np
from app.rag.models import DocumentChunk, SearchResult
from app.rag.embeddings import embedding_service, EMBEDDING_DIM
from app.rag.corpus import DEFAULT_ENTERPRISE_DOCUMENTS
from app.config import settings

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
INDEX_FILE = DATA_DIR / "rag_vector_index.json"

class VectorStore:
    def __init__(self):
        self.chunks: List[DocumentChunk] = []
        self._initialized = False
        self._pg_available = False
        self._pg_pool = None

    async def initialize(self):
        """Initializes the vector store from PostgreSQL/pgvector or embedded storage."""
        if self._initialized:
            return

        DATA_DIR.mkdir(parents=True, exist_ok=True)

        # Attempt PostgreSQL + pgvector connection if configured
        await self._init_postgres()

        # Load from disk cache or initialize default corpus
        await self._load_or_seed_corpus()
        self._initialized = True
        logger.info(f"Vector store initialized with {len(self.chunks)} document chunks. (Postgres pgvector: {self._pg_available})")

    async def _init_postgres(self):
        """Attempts connection to PostgreSQL and verifies pgvector extension."""
        db_url = settings.DATABASE_URL
        if not db_url or "localhost" not in db_url and "postgres" not in db_url:
            return

        try:
            import asyncpg
            # Normalize sqlalchemy asyncpg url to standard postgres url
            clean_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
            pool = await asyncpg.create_pool(clean_url, timeout=2.0)
            async with pool.acquire() as conn:
                await conn.execute("CREATE EXTENSION IF NOT EXISTS vector;")
                await conn.execute(f"""
                    CREATE TABLE IF NOT EXISTS enterprise_document_embeddings (
                        id SERIAL PRIMARY KEY,
                        chunk_id VARCHAR(64) UNIQUE,
                        doc_id VARCHAR(64),
                        title TEXT,
                        department VARCHAR(64),
                        content TEXT,
                        metadata JSONB,
                        embedding vector({EMBEDDING_DIM}),
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """)
            self._pg_pool = pool
            self._pg_available = True
            logger.info("Successfully connected to PostgreSQL with pgvector extension enabled.")
        except Exception as e:
            self._pg_available = False
            logger.info(f"PostgreSQL pgvector not reachable locally ({e}). Operating in embedded high-performance vector mode.")

    async def _load_or_seed_corpus(self):
        """Loads cached chunks from disk or generates embeddings for the enterprise corpus."""
        if INDEX_FILE.exists():
            try:
                with open(INDEX_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.chunks = [DocumentChunk(**item) for item in data]
                if self.chunks:
                    return
            except Exception as e:
                logger.warning(f"Failed to read cached vector index: {e}")

        # Seed default enterprise corpus with embeddings
        logger.info("Generating vector embeddings for enterprise documentation corpus...")
        self.chunks = []
        for doc in DEFAULT_ENTERPRISE_DOCUMENTS:
            content = doc["content"]
            # Generate embedding for document
            emb = await embedding_service.get_embedding(f"{doc['title']}\n{content}")
            chunk = DocumentChunk(
                chunk_id=f"chk-{doc['doc_id']}-01",
                doc_id=doc["doc_id"],
                title=doc["title"],
                department=doc.get("department", "General"),
                content=content,
                metadata=doc.get("metadata", {}),
                embedding=emb,
                created_at="2026-09-26T15:45:00Z"
            )
            self.chunks.append(chunk)

        self._save_to_disk()

    def _save_to_disk(self):
        """Persists indexed chunks to local disk cache."""
        try:
            with open(INDEX_FILE, "w", encoding="utf-8") as f:
                json.dump([c.model_dump() for c in self.chunks], f, indent=2)
        except Exception as e:
            logger.error(f"Error saving vector index to disk: {e}")

    async def add_document(
        self,
        title: str,
        content: str,
        department: str = "Operations",
        metadata: Optional[Dict[str, Any]] = None,
        doc_id: Optional[str] = None
    ) -> DocumentChunk:
        """Embeds and indexes a new enterprise document."""
        await self.initialize()

        actual_doc_id = doc_id or f"DOC-CUSTOM-{len(self.chunks) + 1:03d}"
        embedding = await embedding_service.get_embedding(f"{title}\n{content}")
        
        chunk = DocumentChunk(
            chunk_id=f"chk-{actual_doc_id}-01",
            doc_id=actual_doc_id,
            title=title,
            department=department,
            content=content,
            metadata=metadata or {},
            embedding=embedding,
            created_at="2026-09-26T15:45:00Z"
        )
        self.chunks.append(chunk)
        self._save_to_disk()

        # If Postgres is connected, also write to pgvector table
        if self._pg_available and self._pg_pool:
            try:
                from pgvector.asyncpg import register_vector
                async with self._pg_pool.acquire() as conn:
                    await register_vector(conn)
                    await conn.execute("""
                        INSERT INTO enterprise_document_embeddings (chunk_id, doc_id, title, department, content, metadata, embedding)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        ON CONFLICT (chunk_id) DO NOTHING;
                    """, chunk.chunk_id, chunk.doc_id, chunk.title, chunk.department, chunk.content, json.dumps(chunk.metadata), chunk.embedding)
            except Exception as e:
                logger.warning(f"Error inserting into pgvector table: {e}")

        return chunk

    async def search(
        self,
        query: str,
        top_k: int = 4,
        department: Optional[str] = None
    ) -> List[SearchResult]:
        """
        Executes semantic vector similarity search against enterprise documents.
        """
        await self.initialize()

        if not self.chunks:
            return []

        # If PostgreSQL pgvector is online, use native pgvector cosine distance query
        if self._pg_available and self._pg_pool:
            try:
                from pgvector.asyncpg import register_vector
                query_embedding = await embedding_service.get_embedding(query)
                async with self._pg_pool.acquire() as conn:
                    await register_vector(conn)
                    dept_filter = "AND department = $3" if department else ""
                    params = [query_embedding, top_k]
                    if department:
                        params.append(department)

                    rows = await conn.fetch(f"""
                        SELECT chunk_id, doc_id, title, department, content, metadata,
                               1 - (embedding <=> $1) AS similarity
                        FROM enterprise_document_embeddings
                        WHERE 1=1 {dept_filter}
                        ORDER BY embedding <=> $1
                        LIMIT $2;
                    """, *params)

                    results = [
                        SearchResult(
                            chunk_id=r["chunk_id"],
                            doc_id=r["doc_id"],
                            title=r["title"],
                            department=r["department"],
                            content=r["content"],
                            similarity_score=float(r["similarity"]),
                            metadata=json.loads(r["metadata"]) if isinstance(r["metadata"], str) else (r["metadata"] or {})
                        )
                        for r in rows
                    ]
                    if results:
                        return results
            except Exception as e:
                logger.warning(f"pgvector query fallback to embedded cosine search: {e}")

        # Embedded vector search with cosine similarity
        query_vec = await embedding_service.get_embedding(query)
        scored: List[SearchResult] = []

        for chunk in self.chunks:
            if department and chunk.department.lower() != department.lower():
                continue
            if not chunk.embedding:
                continue

            sim = embedding_service.cosine_similarity(query_vec, chunk.embedding)
            scored.append(
                SearchResult(
                    chunk_id=chunk.chunk_id,
                    doc_id=chunk.doc_id,
                    title=chunk.title,
                    department=chunk.department,
                    content=chunk.content,
                    similarity_score=round(float(sim), 4),
                    metadata=chunk.metadata
                )
            )

        scored.sort(key=lambda x: x.similarity_score, reverse=True)
        return scored[:top_k]

    def get_all_documents(self) -> List[Dict[str, Any]]:
        """Returns metadata for all indexed documents."""
        docs = []
        seen = set()
        for chunk in self.chunks:
            if chunk.doc_id not in seen:
                seen.add(chunk.doc_id)
                docs.append({
                    "doc_id": chunk.doc_id,
                    "title": chunk.title,
                    "department": chunk.department,
                    "preview": chunk.content[:160] + "...",
                    "metadata": chunk.metadata,
                    "dimension": len(chunk.embedding) if chunk.embedding else EMBEDDING_DIM
                })
        return docs

vector_store = VectorStore()
