from app.database.session import engine
from sqlalchemy import text

with engine.begin() as conn:
    # We only need to fix num_bedrooms, because it is the only column that 
    # already exists in the database but contains null values.
    conn.execute(text("UPDATE host_profiles SET num_bedrooms = 1 WHERE num_bedrooms IS NULL;"))
    
print("Existing host profiles updated with a default bedroom count! Safe to migrate.")