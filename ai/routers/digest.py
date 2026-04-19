from fastapi import APIRouter
from pydantic import BaseModel

from services.ark_client import chat_completion

router = APIRouter()


class DigestRequest(BaseModel):
    content: str
    content_type: str = "text"  # text, url, pdf


class DigestResponse(BaseModel):
    summary: str
    key_points: list[str]
    flashcards: list[dict]


@router.post("/", response_model=DigestResponse)
async def digest_content(req: DigestRequest):
    """Digest content into summary, key points, and flashcards."""
    prompt = f"""Please analyze the following content and return a JSON object with:
1. "summary": A concise summary (2-3 sentences)
2. "key_points": A list of key points (3-5 items)
3. "flashcards": A list of flashcard objects, each with "front" (question) and "back" (answer)

Content:
{req.content}

Return valid JSON only."""

    result = await chat_completion(prompt, response_format="json")
    import json

    data = json.loads(result)
    return DigestResponse(**data)
