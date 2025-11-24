from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text("ALTER TABLE datasets ADD COLUMN IF NOT EXISTS dominant_profile JSON"))
    conn.execute(text("ALTER TABLE analysis_runs ADD COLUMN IF NOT EXISTS dominant_profile JSON"))
    conn.execute(text("ALTER TABLE analysis_runs ADD COLUMN IF NOT EXISTS strategic_insights JSON"))  # ← ADD THIS LINE
    conn.commit()
    print("✅ Columns added successfully!")