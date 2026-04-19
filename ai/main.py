import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import digest, quiz, fsrs, embed, analysis

app = FastAPI(
    title="CogniStack AI Service",
    version="0.1.0",
    docs_url="/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("CORS_ORIGIN", "*")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(digest.router, prefix="/digest", tags=["Digest"])
app.include_router(quiz.router, prefix="/generate-quiz", tags=["Quiz"])
app.include_router(fsrs.router, prefix="/fsrs-schedule", tags=["FSRS"])
app.include_router(embed.router, prefix="/embed", tags=["Embed"])
app.include_router(analysis.router, prefix="/analyze-bias", tags=["Analysis"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "cognistack-ai"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
