import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    DATABASE_URL = os.environ["DATABASE_URL"]

    # Must match backend/.env's JWT_SECRET: lets this service verify the same tokens the
    # Node API issues, so /api/export can be called with the dashboard's existing login.
    JWT_SECRET = os.environ.get("JWT_SECRET", "")

    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

    GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "")

    TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")

    # Authorizes GET/POST /api/cron. Vercel sends this automatically as
    # "Authorization: Bearer <CRON_SECRET>" once set as a project env var.
    CRON_SECRET = os.environ.get("CRON_SECRET", "")

    # LangSmith tracing is opt-in via its own env vars (LANGCHAIN_TRACING_V2, LANGCHAIN_API_KEY,
    # LANGCHAIN_PROJECT) which LangChain reads directly - nothing else to wire up here.


config = Config()
