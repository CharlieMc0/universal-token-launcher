from app.db import engine, Base

# This file re-exports the Base and engine from db.py
# to avoid circular imports
# All models should import Base from here