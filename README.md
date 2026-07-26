# Home Away From Home (אירוח לשבת)

A platform connecting hosts and guests (soldiers, national service volunteers, students, and families) for Shabbat hosting. The application combines strict factual filters with semantic vector matches, a multi-stage AI agent for expectation alignment, and real-time in-app chat.

## Project Structure

This repository is organized as a monorepo with separate Backend and Frontend packages:

```text
hosting_for_shabat/
├── Backend/                 # FastAPI (Python) backend application
│   ├── app/                 # Source code (feature-driven structure)
│   ├── alembic/             # Database migration configurations
│   ├── pyproject.toml       # Python package / dependency metadata
│   └── requirements.txt     # Pinning for development
├── Frontend/                # React (TypeScript) client application (Vite)
│   ├── src/                 # Client UI components, stylesheets, and utilities
│   └── package.json         # JavaScript dependencies and scripts
├── package.json             # Root convenience scripts (start both services)
└── PROJECT_CONTEXT.md       # Project roadmap and MVP context
```

## Core Features

- Hybrid matchmaking combining rigid filters (city, kashrut, availability) with semantic ranking using `pgvector` embeddings.
- Multi-stage AI "icebreaker" generation (LangGraph) that creates personalized, guard-railed questions for matched host/guest pairs.
- LangSmith tracing for LLM observability and cost auditing.
- Concurrency-safe booking flows (database row locking) to prevent double-booking.
- Real-time in-app chat (FastAPI WebSockets) and optional off-platform WhatsApp handshakes.

## Tech Stack

Backend
- FastAPI (Python >= 3.11)
- SQLAlchemy (v2.x), Alembic migrations
- PostgreSQL with `pgvector` extension
- LangGraph / LangChain integrations for LLM workflows

Frontend
- React (TypeScript) with Vite
- Uses `pnpm` as package manager (project is compatible with npm/yarn too)

## Running the project (local development)

There are multiple ways to run the system. Choose the one that fits your environment.

A. Start services separately

1. Frontend
   - cd Frontend
   - pnpm install
   - pnpm run dev
   - App will be served by Vite (default port 5173)

2. Backend
   - Ensure Python 3.11+ is installed
   - cd Backend
   - Create and activate a virtual environment (recommended):
     ```bash
     python -m venv .venv
     source .venv/bin/activate  # macOS / Linux
     .\.venv\Scripts\activate # Windows (PowerShell)
     ```
   - Install dependencies:
     ```bash
     pip install -r requirements.txt
     ```
   - Create a `.env` file (see `.env.example`) and set DATABASE_URL, JWT_SECRET, HF access tokens, etc.
   - Run migrations:
     ```bash
     alembic upgrade head
     ```
   - Start the development server:
     ```bash
     uv run uvicorn app.main:app --reload
     ```
   - Backend API docs: http://localhost:8000/docs

B. Start both services from the repository root (convenience)

- The root package.json provides a convenience script that uses `concurrently` to run both services:
  ```bash
  # from repository root
  pnpm install         # installs root devDependencies if using pnpm, or npm install
  npm run dev          # runs frontend and backend concurrently (requires `concurrently`)
  ```

Note: the repository uses `pnpm` for the Frontend package; `npm` works for the root scripts as well, but ensure the required devDependency (`concurrently`) is installed.

## Useful Links

- Backend README: Backend/README.md
- Frontend README: Frontend/README.md
- Project roadmap & tasks: PROJECT_CONTEXT.md


If you'd like, I can now apply refined, localized (Hebrew) instructions or add troubleshooting tips for running migrations and connecting to PostgreSQL. I will not modify any source code — only README files, per your request.