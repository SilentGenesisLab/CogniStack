import os
from openai import AsyncOpenAI

client = AsyncOpenAI(
    api_key=os.environ.get("ARK_API_KEY", ""),
    base_url=os.environ.get(
        "ARK_BASE_URL", "https://ark.cn-beijing.volces.com/api/v3"
    ),
)

MODEL = os.environ.get("ARK_MODEL", "ep-20260312015430-tjwjf")


async def chat_completion(
    prompt: str,
    system_prompt: str = "You are a helpful AI assistant specialized in cognitive science and learning.",
    response_format: str | None = None,
) -> str:
    """Send a chat completion request to ARK AI."""
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": prompt},
    ]

    kwargs: dict = {
        "model": MODEL,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 4096,
    }

    if response_format == "json":
        kwargs["response_format"] = {"type": "json_object"}

    response = await client.chat.completions.create(**kwargs)
    return response.choices[0].message.content or ""


async def get_embedding(text: str) -> list[float]:
    """Generate text embedding using ARK AI."""
    response = await client.embeddings.create(
        model=MODEL,
        input=text,
    )
    return response.data[0].embedding
