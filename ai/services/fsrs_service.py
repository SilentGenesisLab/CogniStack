"""
FSRS v5 (Free Spaced Repetition Scheduler) implementation.
Simplified version of the algorithm for card scheduling.
"""

import math
from datetime import datetime, timedelta

# FSRS v5 default parameters
W = [
    0.4072, 1.1829, 3.1262, 15.4722,  # w0-w3: initial stability
    7.2102,  # w4: difficulty
    0.5316,  # w5: stability decay
    1.0651,  # w6: stability growth
    0.0589,  # w7: difficulty growth
    1.5330,  # w8: retrievability
    0.1418,  # w9
    1.0140,  # w10
    2.0966,  # w11
    0.0130,  # w12
    0.3441,  # w13
    0.3711,  # w14
    2.0913,  # w15
    0.2624,  # w16
]

DECAY = -0.5
FACTOR = 19 / 81
REQUEST_RETENTION = 0.9


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _init_difficulty(rating: int) -> float:
    """Calculate initial difficulty based on first rating."""
    return _clamp(W[4] - math.exp(W[5] * (rating - 1)) + 1, 1.0, 10.0)


def _init_stability(rating: int) -> float:
    """Calculate initial stability based on first rating."""
    return max(W[rating - 1], 0.1)


def _next_difficulty(d: float, rating: int) -> float:
    """Calculate next difficulty after a review."""
    delta = -(W[6] * (rating - 3))
    new_d = d + delta * ((10 - d) / 9)
    # Mean reversion
    new_d = W[7] * _init_difficulty(3) + (1 - W[7]) * new_d
    return _clamp(new_d, 1.0, 10.0)


def _next_recall_stability(
    d: float, s: float, r: float, rating: int
) -> float:
    """Calculate next stability after successful recall."""
    hard_penalty = W[15] if rating == 2 else 1.0
    easy_bonus = W[16] if rating == 4 else 1.0
    return float(
        s
        * (
            1
            + math.exp(W[8])
            * (11 - d)
            * math.pow(s, -W[9])
            * (math.exp((1 - r) * W[10]) - 1)
            * hard_penalty
            * easy_bonus
        )
    )


def _next_forget_stability(d: float, s: float, r: float) -> float:
    """Calculate next stability after forgetting."""
    return float(
        W[11]
        * math.pow(d, -W[12])
        * (math.pow(s + 1, W[13]) - 1)
        * math.exp((1 - r) * W[14])
    )


def _retrievability(elapsed_days: float, stability: float) -> float:
    """Calculate retrievability (probability of recall)."""
    if stability <= 0:
        return 0.0
    return float(math.pow(1 + FACTOR * elapsed_days / stability, DECAY))


def _next_interval(stability: float) -> float:
    """Calculate next interval in days based on stability and desired retention."""
    return float(
        stability / FACTOR * (math.pow(REQUEST_RETENTION, 1 / DECAY) - 1)
    )


def schedule_card(
    stability: float,
    difficulty: float,
    rating: int,
    elapsed_days: float,
) -> dict:
    """
    Schedule a card review using FSRS v5.

    Args:
        stability: Current stability value
        difficulty: Current difficulty value
        rating: Review rating (1=Again, 2=Hard, 3=Good, 4=Easy)
        elapsed_days: Days since last review

    Returns:
        dict with new_stability, new_difficulty, interval_days, due_at
    """
    # First review (new card)
    if stability == 0 and difficulty == 0:
        new_s = _init_stability(rating)
        new_d = _init_difficulty(rating)
    else:
        r = _retrievability(elapsed_days, stability)
        new_d = _next_difficulty(difficulty, rating)

        if rating == 1:  # Again (forgot)
            new_s = _next_forget_stability(difficulty, stability, r)
        else:  # Hard, Good, Easy (recalled)
            new_s = _next_recall_stability(difficulty, stability, r, rating)

    interval = max(1.0, round(_next_interval(new_s)))
    due_at = (datetime.utcnow() + timedelta(days=interval)).isoformat()

    return {
        "new_stability": round(new_s, 4),
        "new_difficulty": round(new_d, 4),
        "interval_days": interval,
        "due_at": due_at,
    }
