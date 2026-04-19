# CogniStack

CogniStack is a cognitive enhancement platform built on cognitive science principles. It helps users digest knowledge, reinforce memory through spaced repetition (FSRS v5), train cognitive abilities, and track personal growth.

## Features

- **Knowledge Digest** - Import articles, PDFs, or text and get AI-powered summaries with auto-generated flashcards
- **Flashcard Review** - Spaced repetition powered by FSRS v5 algorithm for optimal memory retention
- **Cognitive Training** - Exercises for attention, memory, and logical reasoning
- **Task Management** - Eisenhower Matrix based task organization with Pomodoro tracking
- **Growth Analytics** - Visualize learning trends, cognitive radar charts, and review efficiency
- **Mood & Bias Tracking** - Log moods and detect cognitive biases with AI analysis
- **Community** - Knowledge sparring and discussions with other learners

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS, Zustand |
| Auth | Auth.js v5 (Email/Password + Phone/SMS) |
| Database | PostgreSQL 16 (pgvector), Prisma v6 |
| Queue | BullMQ + Redis 7 |
| AI | FastAPI + ARK AI (Volcengine) |
| Infra | Docker Compose, Nginx |

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development)
- Python 3.12+ (for AI service development)

### Production (Docker)

```bash
# Clone the repository
git clone https://github.com/SilentGenesisLab/CogniStack.git
cd CogniStack

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your actual values

# Start all services
docker compose up -d

# Run database migrations
docker compose exec web npx prisma migrate deploy
```

The application will be available at `http://localhost`.

### Local Development

```bash
# Start database and Redis
docker compose -f docker-compose.dev.yml up -d

# Web (Next.js)
cd web
cp .env.example .env.local
pnpm install
pnpm run db:migrate
pnpm dev

# AI Service (FastAPI)
cd ai
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Project Structure

```
CogniStack/
├── web/                    # Next.js 15 frontend + API
│   ├── app/               # App Router pages
│   ├── components/        # React components
│   ├── lib/               # Utilities (Prisma, Auth, Redis, AI)
│   └── prisma/            # Database schema & migrations
├── ai/                    # FastAPI AI service
│   ├── routers/           # API endpoints
│   ├── services/          # Business logic (ARK AI, FSRS)
│   └── worker.py          # BullMQ job consumer
├── nginx/                 # Reverse proxy config
├── docker-compose.yml     # Production orchestration
└── docker-compose.dev.yml # Development (DB + Redis only)
```

## Environment Variables

See `.env.example` for the full list of required environment variables.

## License

Private - SilentGenesisLab
