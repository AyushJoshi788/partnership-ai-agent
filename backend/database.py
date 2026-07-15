import os
import sqlite3
from datetime import datetime
from typing import List, Dict

DB_PATH = os.path.join(os.path.dirname(__file__), "partnership_ai_agent.db")


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = get_connection()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )
    conn.commit()
    conn.close()


def save_chat_message(role: str, content: str) -> None:
    conn = get_connection()
    conn.execute(
        "INSERT INTO chat_history (role, content, created_at) VALUES (?, ?, ?)",
        (role, content, datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()


def get_chat_history(limit: int = 10) -> List[Dict[str, object]]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT id, role, content, created_at FROM chat_history ORDER BY id DESC LIMIT ?",
        (limit,),
    ).fetchall()
    conn.close()
    return [
        {
            "id": row["id"],
            "role": row["role"],
            "content": row["content"],
            "created_at": row["created_at"],
        }
        for row in reversed(rows)
    ]
