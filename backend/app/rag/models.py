from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class DocumentChunk(BaseModel):
    chunk_id: str
    doc_id: str
    title: str
    department: str = "General"
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    embedding: Optional[List[float]] = None
    created_at: Optional[str] = None

class SearchResult(BaseModel):
    chunk_id: str
    doc_id: str
    title: str
    department: str
    content: str
    similarity_score: float
    metadata: Dict[str, Any] = Field(default_factory=dict)

class IngestDocumentRequest(BaseModel):
    doc_id: Optional[str] = None
    title: str
    department: str = "Operations"
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)

class SearchDocumentsRequest(BaseModel):
    query: str
    top_k: int = 4
    department: Optional[str] = None
