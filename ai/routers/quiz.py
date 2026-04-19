from fastapi import APIRouter
from pydantic import BaseModel

from services.ark_client import chat_completion

router = APIRouter()


class QuizRequest(BaseModel):
    content: str
    count: int = 5
    difficulty: str = "medium"  # easy, medium, hard


class QuizQuestion(BaseModel):
    question: str
    options: list[str]
    correct_index: int
    explanation: str


class QuizResponse(BaseModel):
    questions: list[QuizQuestion]


@router.post("/", response_model=QuizResponse)
async def generate_quiz(req: QuizRequest):
    """Generate quiz questions from content."""
    prompt = f"""Based on the following content, generate {req.count} multiple-choice questions at {req.difficulty} difficulty.

Return a JSON object with a "questions" array, where each question has:
- "question": The question text
- "options": Array of 4 options
- "correct_index": Index of the correct option (0-3)
- "explanation": Brief explanation of the correct answer

Content:
{req.content}

Return valid JSON only."""

    result = await chat_completion(prompt, response_format="json")
    import json

    data = json.loads(result)
    return QuizResponse(**data)
