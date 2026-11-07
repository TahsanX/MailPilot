import psycopg2
import psycopg2.extras

from app.config import config


def get_conn():
    conn = psycopg2.connect(config.DATABASE_URL, sslmode="require")
    conn.autocommit = True
    return conn


def query(sql, params=None):
    """Runs one statement on its own short-lived connection - each cron tick is a single
    serverless invocation, so there is no long-lived pool to manage here."""
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params or ())
            if cur.description:
                return [dict(row) for row in cur.fetchall()]
            return []
    finally:
        conn.close()
