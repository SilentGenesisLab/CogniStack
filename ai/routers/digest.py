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
    """Digest content into summary, key points, and flashcards (Chinese output)."""
    prompt = f"""请分析以下内容，以 JSON 格式返回结果，包含以下字段：
1. "summary"：2-3 句话的核心摘要（中文）
2. "key_points"：3-5 条关键要点的列表（中文，每条简洁明了）
3. "flashcards"：知识卡片列表，每张卡片包含 "front"（问题）和 "back"（答案），共 4-8 张，用于帮助记忆核心知识点（中文）

内容如下：
{req.content}

只返回合法的 JSON，不要有任何其他文字。"""

    system = "你是一位认知科学专家，擅长将复杂内容转化为结构化的学习材料，帮助用户高效内化知识。请用中文回答。"

    result = await chat_completion(prompt, system_prompt=system, response_format="json")
    import json

    data = json.loads(result)
    return DigestResponse(**data)
