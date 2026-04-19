from fastapi import APIRouter
from pydantic import BaseModel

from services.ark_client import chat_completion

router = APIRouter()


class BiasAnalysisRequest(BaseModel):
    text: str
    context: str = ""


class BiasAnalysisResponse(BaseModel):
    biases: list[str]
    analysis: str
    suggestions: list[str]


@router.post("/", response_model=BiasAnalysisResponse)
async def analyze_bias(req: BiasAnalysisRequest):
    """Analyze text for cognitive biases."""
    prompt = f"""Analyze the following text for cognitive biases. Return a JSON object with:
1. "biases": List of identified cognitive biases (e.g., "confirmation bias", "anchoring bias")
2. "analysis": Brief analysis of how these biases manifest in the text
3. "suggestions": List of suggestions to overcome these biases

Text:
{req.text}

Context (if any):
{req.context}

Return valid JSON only."""

    result = await chat_completion(prompt, response_format="json")
    import json

    data = json.loads(result)
    return BiasAnalysisResponse(**data)
