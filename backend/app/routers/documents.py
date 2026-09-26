from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from app.rag.vector_store import vector_store
from app.rag.models import IngestDocumentRequest, SearchDocumentsRequest, SearchResult

router = APIRouter(prefix="/documents", tags=["RAG Documents"])

@router.get("")
async def list_documents():
    """Lists all indexed enterprise documents in the RAG vector store."""
    await vector_store.initialize()
    docs = vector_store.get_all_documents()
    return {
        "status": "success",
        "total_documents": len(docs),
        "embedding_dimension": 3072,
        "engine": "PostgreSQL pgvector / Embedded Vector Index",
        "documents": docs
    }

@router.post("/search")
async def search_documents_endpoint(request: SearchDocumentsRequest):
    """Executes semantic vector similarity search against company documents."""
    results = await vector_store.search(
        query=request.query,
        top_k=request.top_k,
        department=request.department
    )
    return {
        "status": "success",
        "query": request.query,
        "matches_count": len(results),
        "results": [r.model_dump() for r in results]
    }

@router.post("/ingest")
async def ingest_document_endpoint(request: IngestDocumentRequest):
    """Ingests a new enterprise document into the RAG vector store with 3072-dim embeddings."""
    chunk = await vector_store.add_document(
        title=request.title,
        content=request.content,
        department=request.department,
        metadata=request.metadata,
        doc_id=request.doc_id
    )
    return {
        "status": "success",
        "message": f"Successfully ingested and indexed '{chunk.title}'",
        "chunk_id": chunk.chunk_id,
        "doc_id": chunk.doc_id,
        "department": chunk.department
    }
