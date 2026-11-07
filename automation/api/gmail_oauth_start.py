from urllib.parse import urlencode

from flask import Flask, redirect, request

from app.config import config

app = Flask(__name__)

SCOPE = "https://www.googleapis.com/auth/gmail.modify"


@app.route("/api/gmail_oauth_start", methods=["GET"])
def handler():
    user_id = request.args.get("userId", "")
    if not user_id:
        return "Missing userId.", 400

    params = {
        "client_id": config.GOOGLE_CLIENT_ID,
        "redirect_uri": config.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": SCOPE,
        "access_type": "offline",
        "prompt": "consent",
        "state": user_id,
    }
    return redirect(f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}")
