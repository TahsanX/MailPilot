from flask import Flask, jsonify, request

from app.db import query
from app.telegram_client import send_message

app = Flask(__name__)


@app.route("/api/telegram_webhook", methods=["POST"])
def handler():
    update = request.get_json(silent=True) or {}
    message = update.get("message") or {}
    text = (message.get("text") or "").strip()
    chat_id = message.get("chat", {}).get("id")

    prefix = next((p for p in ("/start ", "/link ") if text.startswith(p)), None)
    if not chat_id or not prefix:
        return jsonify({"ok": True})

    code = text[len(prefix):].strip()
    rows = query(
        "select user_id from telegram_link_codes where code = %s and expires_at > now()", (code,)
    )
    if not rows:
        send_message(str(chat_id), "That link code is invalid or has expired. Get a new one from your MailPilot dashboard.")
        return jsonify({"ok": True})

    user_id = rows[0]["user_id"]
    query(
        """
        insert into integrations (user_id, telegram_chat_id) values (%s, %s)
        on conflict (user_id) do update set telegram_chat_id = excluded.telegram_chat_id, updated_at = now()
        """,
        (user_id, str(chat_id)),
    )
    query("delete from telegram_link_codes where code = %s", (code,))
    send_message(str(chat_id), "MailPilot is now linked to this chat. You'll get urgent email alerts here.")
    return jsonify({"ok": True})
