"""
BullMQ-compatible worker that consumes jobs from Redis queues.
Uses the same Redis instance as the Next.js BullMQ queues.
"""

import os
import json
import asyncio
import logging
from redis.asyncio import Redis

from services.ark_client import chat_completion, get_embedding
from services.fsrs_service import schedule_card

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cognistack-worker")

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")

QUEUE_HANDLERS = {
    "digest": "handle_digest",
    "quiz": "handle_quiz",
    "embed": "handle_embed",
}


async def handle_digest(data: dict) -> dict:
    """Process a digest job."""
    content = data.get("content", "")
    prompt = f"""Analyze the following content and return a JSON object with:
1. "summary": A concise summary
2. "key_points": A list of key points
3. "flashcards": A list of flashcard objects with "front" and "back"

Content: {content}

Return valid JSON only."""
    result = await chat_completion(prompt, response_format="json")
    return json.loads(result)


async def handle_quiz(data: dict) -> dict:
    """Process a quiz generation job."""
    content = data.get("content", "")
    count = data.get("count", 5)
    prompt = f"""Generate {count} multiple-choice questions from this content.
Return JSON with "questions" array, each having "question", "options" (4 items),
"correct_index" (0-3), "explanation".

Content: {content}

Return valid JSON only."""
    result = await chat_completion(prompt, response_format="json")
    return json.loads(result)


async def handle_embed(data: dict) -> dict:
    """Process an embedding job."""
    text = data.get("text", "")
    embedding = await get_embedding(text)
    return {"embedding": embedding, "dimensions": len(embedding)}


async def process_job(queue_name: str, job_data: dict) -> dict:
    """Route job to appropriate handler."""
    handler_name = QUEUE_HANDLERS.get(queue_name)
    if not handler_name:
        raise ValueError(f"Unknown queue: {queue_name}")

    handler = globals()[handler_name]
    return await handler(job_data)


async def poll_queue(redis_client: Redis, queue_name: str):
    """Poll a BullMQ queue for jobs."""
    wait_key = f"bull:{queue_name}:wait"
    while True:
        try:
            result = await redis_client.brpop(wait_key, timeout=5)
            if result is None:
                continue

            _, job_id = result
            job_id = job_id.decode() if isinstance(job_id, bytes) else job_id

            # Get job data
            job_key = f"bull:{queue_name}:{job_id}"
            job_raw = await redis_client.hgetall(job_key)
            if not job_raw:
                continue

            data_raw = job_raw.get(b"data", b"{}")
            data = json.loads(data_raw)

            logger.info(f"Processing job {job_id} from {queue_name}")

            try:
                result_data = await process_job(queue_name, data)
                # Mark as completed
                await redis_client.hset(
                    job_key,
                    mapping={
                        "returnvalue": json.dumps(result_data),
                        "finishedOn": str(asyncio.get_event_loop().time()),
                    },
                )
                logger.info(f"Job {job_id} completed")
            except Exception as e:
                logger.error(f"Job {job_id} failed: {e}")
                await redis_client.hset(
                    job_key,
                    mapping={"failedReason": str(e)},
                )

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Worker error on {queue_name}: {e}")
            await asyncio.sleep(1)


async def main():
    """Start workers for all queues."""
    redis_client = Redis.from_url(REDIS_URL, decode_responses=False)
    logger.info(f"Worker connected to Redis: {REDIS_URL}")

    tasks = [
        asyncio.create_task(poll_queue(redis_client, queue_name))
        for queue_name in QUEUE_HANDLERS
    ]

    logger.info(f"Listening on queues: {list(QUEUE_HANDLERS.keys())}")

    try:
        await asyncio.gather(*tasks)
    except KeyboardInterrupt:
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
    finally:
        await redis_client.aclose()


if __name__ == "__main__":
    asyncio.run(main())
