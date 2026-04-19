from fastapi import APIRouter
from pydantic import BaseModel

from services.ark_client import get_embedding

router = APIRouter()


class EmbedRequest(BaseModel):
    text: str


class EmbedResponse(BaseModel):
    embedding: list[float]
    dimensions: int


@router.post("/", response_model=EmbedResponse)
async def embed_text(req: EmbedRequest):
    """Generate text embedding vector."""
    embedding = await get_embedding(req.text)
    return EmbedResponse(embedding=embedding, dimensions=len(embedding))
