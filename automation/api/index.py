"""
Vercel's Flask framework preset wants exactly one Flask app as the entrypoint (auto-detected
by variable name `app` in this file), not one app per api/*.py file. Every route the automation
service exposes lives on this single app instead.
"""
import hmac
from urllib.parse import urlencode

import jwt
import requests
from flask import Flask, Response, jsonify, redirect, request

from app.config import config
from app.db import query
from app.excel_export import build_report
from app.gmail_client import create_draft, fetch_new_messages
from app.graph import build_graph
from app.telegram_client import send_message

app = Flask(__name__)
GRAPH = build_graph()

MAX_USERS_PER_TICK = 3
MAX_EMAILS_PER_USER = 5
GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.modify"


# ------------------------------------------------------------------ GET/POST /api/cron

def _cron_authorized(req) -> bool:
    if not config.CRON_SECRET:
        return False
    return hmac.compare_digest(req.headers.get("Authorization", ""), f"Bearer {config.CRON_SECRET}")


def _load_profile(user_id: str):
    role = query("select hr_enabled, care_enabled from job_roles where user_id = %s", (user_id,))
    details = query("select company_name, company_overview, faqs from details where user_id = %s", (user_id,))
    if not role or not details:
        return None

    r, d = role[0], details[0]
    pipelines = ["general"]
    if r["hr_enabled"]:
        pipelines.append("hr")
    if r["care_enabled"]:
        pipelines.append("customer_care")

    kb_parts = [d["company_name"], d["company_overview"]]
    for faq in d["faqs"] or []:
        kb_parts.append(f"Q: {faq.get('question', '')} A: {faq.get('answer', '')}")

    return {"pipelines": pipelines, "knowledge_base": "\n".join(p for p in kb_parts if p)}


def _upsert_email(user_id: str, msg: dict, classification: dict, draft_created: bool):
    query(
        """
        insert into email_activity
          (user_id, email_id, thread_id, received_at, sender_name, sender_email, subject,
           priority, category, pipeline, summary, action_required, reply_needed, draft_created,
           status, automation_outcome)
        values
          (%(user_id)s, %(email_id)s, %(thread_id)s, now(), %(sender)s, %(sender)s, %(subject)s,
           %(priority)s, %(category)s, %(pipeline)s, %(summary)s, %(reply_needed)s, %(reply_needed)s,
           %(draft_created)s, %(status)s, 'completed')
        on conflict (user_id, email_id) do update set
          priority = excluded.priority,
          category = excluded.category,
          pipeline = excluded.pipeline,
          summary = excluded.summary,
          draft_created = excluded.draft_created,
          status = case when email_activity.handled_at is not null
                         then email_activity.status else excluded.status end
        """,
        {
            "user_id": user_id,
            "email_id": msg["email_id"],
            "thread_id": msg["thread_id"],
            "sender": msg["from"],
            "subject": msg["subject"],
            "priority": classification.get("priority", "low"),
            "category": classification.get("category", "other"),
            "pipeline": classification.get("pipeline", "general"),
            "summary": classification.get("summary", ""),
            "reply_needed": bool(classification.get("reply_needed")),
            "draft_created": draft_created,
            "status": "draft_ready" if draft_created else "unread",
        },
    )


def _upsert_candidate(user_id: str, msg: dict, candidate: dict):
    query(
        """
        insert into candidates
          (user_id, email_id, candidate_name, role, experience, education, projects, recommendation,
           sender_email, cv_filename, received_at)
        values
          (%(user_id)s, %(email_id)s, %(name)s, %(role)s, %(experience)s, %(education)s, %(projects)s,
           %(recommendation)s, %(sender)s, '', now())
        on conflict (user_id, email_id) do update set
          candidate_name = excluded.candidate_name,
          role = excluded.role,
          experience = excluded.experience,
          education = excluded.education,
          projects = excluded.projects,
          recommendation = excluded.recommendation
        """,
        {
            "user_id": user_id,
            "email_id": msg["email_id"],
            "sender": msg["from"],
            "name": candidate.get("candidateName", ""),
            "role": candidate.get("role", ""),
            "experience": candidate.get("experience", ""),
            "education": candidate.get("education", ""),
            "projects": candidate.get("projects", ""),
            "recommendation": candidate.get("recommendation", ""),
        },
    )


def _run_tick():
    integrations = query(
        """select user_id, gmail_refresh_token, gmail_history_id, telegram_chat_id
             from integrations where gmail_refresh_token is not null
             order by updated_at limit %s""",
        (MAX_USERS_PER_TICK,),
    )

    processed_users = 0
    processed_emails = 0

    for integ in integrations:
        profile = _load_profile(integ["user_id"])
        if not profile:
            continue

        messages, new_history_id = fetch_new_messages(
            integ["gmail_refresh_token"], integ["gmail_history_id"], max_results=MAX_EMAILS_PER_USER
        )

        for msg in messages:
            state = GRAPH.invoke({
                "user_id": integ["user_id"],
                "pipelines": profile["pipelines"],
                "knowledge_base": profile["knowledge_base"],
                "email": msg,
                "classification": None,
                "draft_text": None,
                "candidate": None,
            })
            classification = state.get("classification") or {}
            draft_created = False

            if state.get("draft_text"):
                try:
                    create_draft(
                        integ["gmail_refresh_token"], msg["thread_id"], msg["from"],
                        f"Re: {msg['subject']}", state["draft_text"],
                    )
                    draft_created = True
                except Exception as err:  # Gmail/network errors must not stop the rest of the batch.
                    print(f"Draft creation failed for {msg['email_id']}: {err}")

            _upsert_email(integ["user_id"], msg, classification, draft_created)

            if state.get("candidate"):
                _upsert_candidate(integ["user_id"], msg, state["candidate"])

            if classification.get("priority") == "urgent" and integ["telegram_chat_id"]:
                send_message(
                    integ["telegram_chat_id"],
                    f"Urgent: {msg['subject']}\nFrom: {msg['from']}\n{classification.get('summary', '')}",
                )

            processed_emails += 1

        query(
            "update integrations set gmail_history_id = %s, updated_at = now() where user_id = %s",
            (new_history_id, integ["user_id"]),
        )
        processed_users += 1

    return {"users": processed_users, "emails": processed_emails}


@app.route("/api/cron", methods=["GET", "POST"])
def cron_handler():
    if not _cron_authorized(request):
        return jsonify({"error": {"code": "unauthorized", "message": "Invalid cron secret."}}), 401
    result = _run_tick()
    return jsonify({"ok": True, **result})


# ------------------------------------------------------------- GET /api/gmail_oauth_start

@app.route("/api/gmail_oauth_start", methods=["GET"])
def gmail_oauth_start():
    user_id = request.args.get("userId", "")
    if not user_id:
        return "Missing userId.", 400

    params = {
        "client_id": config.GOOGLE_CLIENT_ID,
        "redirect_uri": config.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": GMAIL_SCOPE,
        "access_type": "offline",
        "prompt": "consent",
        "state": user_id,
    }
    return redirect(f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}")


# ---------------------------------------------------------- GET /api/gmail_oauth_callback

@app.route("/api/gmail_oauth_callback", methods=["GET"])
def gmail_oauth_callback():
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
    if config.FRONTEND_URL:
        return redirect(f"{config.FRONTEND_URL.rstrip('/')}/?gmail=connected")
    return "Gmail connected. You can close this tab and return to MailPilot."


# -------------------------------------------------------------- POST /api/telegram_webhook

@app.route("/api/telegram_webhook", methods=["POST"])
def telegram_webhook():
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


# ------------------------------------------------------------------- GET /api/export

@app.route("/api/export", methods=["GET"])
def export_handler():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return {"error": {"code": "unauthorized", "message": "Authentication required."}}, 401

    try:
        payload = jwt.decode(auth[7:], config.JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        return {"error": {"code": "unauthorized", "message": "Invalid or expired token."}}, 401

    data = build_report(payload["sub"])
    return Response(
        data,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=mailpilot-report.xlsx"},
    )
