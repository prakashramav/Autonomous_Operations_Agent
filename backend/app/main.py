from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import chat, documents

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Enterprise Operations Agent API (EnterpriseOps-Agent)"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(chat.router, prefix=settings.API_V1_PREFIX)
app.include_router(chat.router, prefix="")
app.include_router(documents.router, prefix=settings.API_V1_PREFIX)
app.include_router(documents.router, prefix="")

@app.get("/")
async def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "healthy",
        "endpoints": {
            "chat_stream": f"{settings.API_V1_PREFIX}/chat",
            "chat_status": f"{settings.API_V1_PREFIX}/chat/status",
            "docs": "/docs"
        }
    }

@app.get("/health")
async def health_check():
    return {"status": "ok"}
