import requests
from flask import Flask, request

from app.config import config
from app.db import query

app = Flask(__name__)


@app.route("/api/gmail_oauth_callback", methods=["GET"])
def handler():
    code = request.args.get("code")
    user_id = request.args.get("state")
    if not code or not user_id:
        return "Missing code or state.", 400

    token_res = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": code,
            "client_id": config.GOOGLE_CLIENT_ID,
            "client_secret": config.GOOGLE_CLIENT_SECRET,
            "redirect_uri": config.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        },
        timeout=10,
    )
    if not token_res.ok:
        return f"Google rejected the authorization: {token_res.text}", 400

    tokens = token_res.json()
    refresh_token = tokens.get("refresh_token")
    if not refresh_token:
        return (
            "Google did not return a refresh token (it only does this on first consent). "
            "Remove MailPilot's access at https://myaccount.google.com/permissions and try again.",
            400,
        )

    profile_res = requests.get(
        "https://www.googleapis.com/gmail/v1/users/me/profile",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
        timeout=10,
    )
    gmail_email = profile_res.json().get("emailAddress", "") if profile_res.ok else ""

    query(
        """
        insert into integrations (user_id, gmail_email, gmail_refresh_token) values (%s, %s, %s)
        on conflict (user_id) do update set
          gmail_email = excluded.gmail_email,
          gmail_refresh_token = excluded.gmail_refresh_token,
          gmail_history_id = null,
          updated_at = now()
        """,
        (user_id, gmail_email, refresh_token),
    )
    return "Gmail connected. You can close this tab and return to MailPilot."
