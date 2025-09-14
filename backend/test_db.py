from database import create_tables, get_db

try:
    print("Testing database connection...")
    create_tables()
    print("Database connection successful!")
    print("Tables created successfully!")
except Exception as e:
    print(f"Database connection failed: {e}")