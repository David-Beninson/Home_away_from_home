# Home Away From Home - Backend API

This is the backend service for the **Hosting for Shabbat** platform, built using Python, FastAPI, SQLAlchemy ORM, PostgreSQL, and LangGraph.

## Architecture

The backend follows a **Domain-Driven Feature-based structure** to maintain maximum modularity, readability, and scalability.

```text
app/
├── core/                     # Configuration and core environment loaders
├── database/                 # SQLAlchemy engines, session makers, and DB models
│   └── models/               # Centralized DB definitions (User, Profile, Listings, Match, Post)
├── features/                 # Domain-specific API routers and Pydantic schemas
│   ├── auth/                 # Registration, login, profiles management, JWT credentials
│   ├── listings/             # Host listings creation and host discovery search
│   ├── posts/                # Guest posts board and reverse-auction claiming
│   ├── bookings/             # Direct booking requests, approvals, WhatsApp & Icebreaker generation
│   └── admin/                # Admin management panel
├── agent/                    # AI Agent helper services (embeddings, icebreaker generation)
└── main.py                   # Main FastAPI entry point
```

---

## AI Agent Integration (Shabbat Icebreakers)

The platform features a state-of-the-art, multi-stage AI Agent built using **LangGraph** to generate personalized icebreaker questions for matched hosts and guests. The goal of these questions is to ease social friction and coordinate practical expectations before Shabbat.

### 4-Node Agent Workflow
1. **Commonality Analysis (`analyze_commonalities`):** Compares the host's profile details (city, kashrut level, religious orientation, household notes) with the guest's profile preferences (soldier status, dietary constraints, give-and-take skills, matching description) to write a concise compatibility analysis highlighting shared interests and potential areas requiring coordination.
2. **Questions Generation (`generate_questions`):** Takes the analyzed commonalities and profiles to generate 3 polite, open-ended, and highly personalized icebreaker questions.
3. **Quality Guardrails (`guardrails`):** Reviews the generated questions to ensure they respect Shabbat traditions and holiness, are friendly, and do not cross personal boundaries.
4. **Parsing & Formatting (`parse_validate`):** Sanitizes list formatting, cleans markdown characters, and parses the final text into a clean Python array of strings with a robust default fallback.

### Tracing & LLM Service
* **LangSmith Tracing:** The graph integrates with **LangSmith** for automatic execution tracing, token consumption logging, latency auditing, and run monitoring.
* **OpenAI-Compatible LLM Client:** Configured via environment variables (`LLM_PROVIDER`, `LLM_MODEL`, `LLM_API_BASE`, `LLM_TIMEOUT`, `LLM_HEADERS`) using `OpenAICompatibleLLM`.

---

## Features & API Routes

### 🔐 Authentication (`/api/auth`)
* `POST /api/auth/register` - Registers a new user and auto-initializes a default profile (Host/Guest).
* `POST /api/auth/login` - Authenticates credentials and returns a secure JWT access token.
* `GET /api/auth/me` - Retrieves the authenticated user's details and profile configuration.
* `PUT /api/auth/profile/host` - Updates host-specific details (city, neighborhood, kashrut level, availability, emergency flag, max guests, etc. and updates their vector embedding).
* `PUT /api/auth/profile/guest` - Updates guest-specific details (soldier status, give & take skills, food preferences, release date, etc. and updates their vector embedding).

### 🏠 Host Listings (`/api/listings`)
* `POST /api/listings` - Creates a listing advertising hosting availability.
* `GET /api/listings/my` - Returns all listings created by the authenticated host.
* `DELETE /api/listings/{listing_id}` - Deletes a hosting listing.
* `GET /api/listings/search` - Searches for host profiles filtered by city and kashrut level, ordered dynamically by semantic distance to the current guest's preferences using `pgvector`. Returns a `match_score` percentage.

### 📣 Guest Posts / Board (`/api/posts`)
* `POST /api/posts` - Creates a request post by a guest looking for a host.
* `GET /api/posts` - Returns a feed of all open, unclaimed guest request posts.
* `POST /api/posts/{post_id}/claim` - Claims a guest request by a host. Uses database row locks (`with_for_update()`) to prevent concurrent claim race conditions.

### 🤝 Bookings & Matches (`/api/bookings` & `/api/matches`)
* `POST /api/bookings/request` - Requests accommodation from a guest to a host profile.
* `GET /api/bookings/incoming` - Returns pending booking requests awaiting the host's approval.
* `PATCH /api/bookings/{match_id}/respond` - Accepts or rejects a pending booking request.
* `GET /api/matches/{match_id}/details` - Retrieves detailed information about an active match, including a pre-filled click-to-chat WhatsApp link and custom AI icebreaker questions from the LangGraph agent.
### 💬 In-App Chat (`/api/matches`)
* `GET /api/matches/{match_id}/messages` - Retrieves chat message history for a booking match, sorted chronologically.
* `WS /api/matches/{match_id}/chat/ws` - WebSocket endpoint for bidirectional real-time messaging between host and guest. Authenticates via JWT token query param and saves messages in the database.


---

## Getting Started

### Prerequisites
* Python >= 3.11
* PostgreSQL database with `pgvector` extension enabled.

### Installation
1. Install dependencies using `uv` (recommended):
   ```bash
   uv sync
   ```
2. Create a `.env` file in the root of the Backend directory:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/dbname
   JWT_SECRET=your_jwt_secret_key_here
   JWT_ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=1440
   ADMIN_EMAIL=admin@hostingforshabbat.com
   ADMIN_PASSWORD=adminpassword123
   
   # Primary LLM Configuration
   LLM_PROVIDER=openai
   LLM_MODEL=qwen2.5vl:7b-q8_0
   LLM_API_BASE=https://yummy-words-run.loca.lt/v1
   LLM_TIMEOUT=300000
   LLM_HEADERS={"Bypass-Tunnel-Reminders": "true"}
   
   # LangSmith Monitoring / Tracing (Optional)
   LANGCHAIN_TRACING_V2=true
   LANGCHAIN_API_KEY=your_langsmith_api_key_here
   LANGCHAIN_PROJECT=hosting-for-shabat
   ```
3. Run migrations to initialize the database:
   ```bash
   uv run alembic upgrade head
   ```
4. Run the FastAPI development server:
   ```bash
   uv run uvicorn app.main:app --reload
   ```
   The API will be available at `http://localhost:8000` with interactive documentation at `http://localhost:8000/docs`.
