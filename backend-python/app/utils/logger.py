import sys
from pathlib import Path
from loguru import logger

from app.config import Config

# Configure base directory for logs
logs_dir = Path("logs")
logs_dir.mkdir(exist_ok=True)

# Get log level from environment or use default
LOG_LEVEL = Config.LOG_LEVEL.upper()

# Remove default logger
logger.remove()

# Add console logger
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
           "<level>{level: <8}</level> | "
           "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
           "<level>{message}</level>",
    level=LOG_LEVEL,
    colorize=True,
)

# Add file loggers
logger.add(
    logs_dir / "all.log",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | "
           "{name}:{function}:{line} - {message}",
    level=LOG_LEVEL,
    rotation="10 MB",
    retention="30 days",
)

logger.add(
    logs_dir / "error.log",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | "
           "{name}:{function}:{line} - {message}",
    level="ERROR",
    rotation="10 MB",
    retention="30 days",
)

logger.info(f"Logger initialized with level: {LOG_LEVEL}")

__all__ = ["logger"] 