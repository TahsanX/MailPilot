import requests

from app.config import config


def send_message(chat_id: str, text: str) -> dict:
    if not config.TELEGRAM_BOT_TOKEN or not chat_id:
        return {"sent": False, "reason": "not_configured"}
    url = f"https://api.telegram.org/bot{config.TELEGRAM_BOT_TOKEN}/sendMessage"
    try:
        res = requests.post(url, json={"chat_id": chat_id, "text": text[:4000]}, timeout=10)
        res.raise_for_status()
        return {"sent": True}
    except requests.RequestException as err:
        print(f"Telegram send failed: {err}")
        return {"sent": False, "reason": str(err)}
