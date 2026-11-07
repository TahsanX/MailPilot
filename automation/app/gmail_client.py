import base64
import email.mime.text

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from app.config import config

SCOPES = ["https://www.googleapis.com/auth/gmail.modify"]


def _creds(refresh_token: str) -> Credentials:
    return Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=config.GOOGLE_CLIENT_ID,
        client_secret=config.GOOGLE_CLIENT_SECRET,
        scopes=SCOPES,
    )


def fetch_new_messages(refresh_token: str, history_id: str | None, max_results: int = 5):
    """Returns (messages, new_history_id). On the first run (history_id is None) this lists the
    most recent inbox messages instead, since there is no cursor yet to resume from."""
    service = build("gmail", "v1", credentials=_creds(refresh_token))

    if history_id:
        resp = service.users().history().list(
            userId="me", startHistoryId=history_id, historyTypes=["messageAdded"]
        ).execute()
        seen = set()
        ids = []
        for h in resp.get("history", []):
            for added in h.get("messagesAdded", []):
                mid = added["message"]["id"]
                if mid not in seen:
                    seen.add(mid)
                    ids.append(mid)
        new_history_id = resp.get("historyId", history_id)
    else:
        resp = service.users().messages().list(userId="me", labelIds=["INBOX"], maxResults=max_results).execute()
        ids = [m["id"] for m in resp.get("messages", [])]
        new_history_id = service.users().getProfile(userId="me").execute().get("historyId")

    messages = []
    for mid in ids[:max_results]:
        msg = service.users().messages().get(userId="me", id=mid, format="full").execute()
        messages.append(_parse_message(msg))
    return messages, new_history_id


def _parse_message(msg: dict) -> dict:
    headers = {h["name"].lower(): h["value"] for h in msg["payload"].get("headers", [])}
    return {
        "email_id": msg["id"],
        "thread_id": msg["threadId"],
        "subject": headers.get("subject", ""),
        "from": headers.get("from", ""),
        "date": headers.get("date", ""),
        "body": _extract_body(msg["payload"]),
    }


def _extract_body(payload: dict) -> str:
    if payload.get("body", {}).get("data"):
        return base64.urlsafe_b64decode(payload["body"]["data"]).decode("utf-8", errors="ignore")
    for part in payload.get("parts") or []:
        if part.get("mimeType") == "text/plain" and part.get("body", {}).get("data"):
            return base64.urlsafe_b64decode(part["body"]["data"]).decode("utf-8", errors="ignore")
    for part in payload.get("parts") or []:
        text = _extract_body(part)
        if text:
            return text
    return ""


def create_draft(refresh_token: str, thread_id: str, to_addr: str, subject: str, body_text: str) -> dict:
    service = build("gmail", "v1", credentials=_creds(refresh_token))
    msg = email.mime.text.MIMEText(body_text)
    msg["to"] = to_addr
    msg["subject"] = subject
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    return service.users().drafts().create(
        userId="me", body={"message": {"raw": raw, "threadId": thread_id}}
    ).execute()
