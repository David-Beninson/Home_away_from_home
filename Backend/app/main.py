from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.features.auth.router import router as auth_router
from app.features.listings.router import router as listings_router
from app.features.posts.router import router as posts_router
from app.features.bookings.router import router as bookings_router
from app.features.admin.router import router as admin_router
from app.features.chat.router import router as chat_router
from app.features.availability.router import router as availability_router
from app.features.notifications.router import router as notifications_router
from app.features.verification.router import router as verification_router
from app.features.stats.router import router as stats_router
from app.features.agent.router import router as agent_router

app = FastAPI(
    title="Hosting for Shabbat API",
    description="Backend API for managing host and guest matchmaking for Shabbat",
    version="1.0.0"
)

_cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
if "*" not in _cors_origins:
    _cors_origins.extend(["http://localhost:5173", "http://127.0.0.1:5173"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if "*" in _cors_origins else _cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(listings_router, prefix="/api")
app.include_router(posts_router, prefix="/api")
app.include_router(bookings_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(availability_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(verification_router, prefix="/api")
app.include_router(stats_router, prefix="/api")
app.include_router(agent_router, prefix="/api")


# lifeSpan
@app.on_event("startup")
def ensure_db_schema():
    try:
        from app.database.session import engine
        from sqlalchemy import text
        try:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS secondary_document_image_path VARCHAR(512) DEFAULT '';"))
                conn.execute(text("ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS secondary_document_image_data TEXT;"))
        except TimeoutError:
            print("DB migration timeout - will try again on next request")
        except Exception as e:
            print(f"Startup DB migration warning: {e}")
    except Exception as e:
        print(f"Failed to ensure DB schema: {e}")

@app.get("/")
def read_root():
    return {"message": "Hosting for Shabbat API is running"}
