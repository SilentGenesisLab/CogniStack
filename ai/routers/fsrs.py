from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime

from services.fsrs_service import schedule_card

router = APIRouter()


class FSRSRequest(BaseModel):
    stability: float
    difficulty: float
    rating: int  # 1=Again, 2=Hard, 3=Good, 4=Easy
    elapsed_days: float


class FSRSResponse(BaseModel):
    new_stability: float
    new_difficulty: float
    interval_days: float
    due_at: str


@router.post("/", response_model=FSRSResponse)
async def fsrs_schedule(req: FSRSRequest):
    """Calculate next review schedule using FSRS v5 algorithm."""
    result = schedule_card(
        stability=req.stability,
        difficulty=req.difficulty,
        rating=req.rating,
        elapsed_days=req.elapsed_days,
    )
    return FSRSResponse(**result)
