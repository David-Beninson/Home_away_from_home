from app.database.session import engine
from sqlalchemy import text

with engine.begin() as conn:
    # This deletes ONLY the alembic tracking table, leaving all your data safe!
    conn.execute(text("DROP TABLE IF EXISTS alembic_version;"))

print("Alembic memory cleared! User data is completely safe.")