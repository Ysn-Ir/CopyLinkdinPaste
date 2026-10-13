import logging
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from .config import DATABASE_URL

logger = logging.getLogger("pfe_hunter.db")

Base = declarative_base()

def get_engine_and_session():
    # Attempt connecting to primary database (PostgreSQL)
    try:
        engine = create_engine(
            DATABASE_URL,
            pool_pre_ping=True,
            pool_recycle=3600,
            connect_args={"connect_timeout": 3} if "postgresql" in DATABASE_URL else {}
        )
        # Test connection
        with engine.connect() as conn:
            pass
        logger.info(f"Connected to primary database: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")
        return engine, "postgresql"
    except Exception as e:
        logger.warning(f"Failed to connect to primary DB ({e}). Falling back to local SQLite.")
        data_dir = Path(__file__).resolve().parent.parent / "data"
        data_dir.mkdir(exist_ok=True)
        sqlite_url = f"sqlite:///{data_dir / 'pfe_hunter.db'}"
        fallback_engine = create_engine(
            sqlite_url,
            connect_args={"check_same_thread": False}
        )
        return fallback_engine, "sqlite"

engine, DB_ENGINE_TYPE = get_engine_and_session()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
