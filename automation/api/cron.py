import hmac

from flask import Flask, jsonify, request

from app.config import config
from app.db import query
from app.gmail_client import create_draft, fetch_new_messages
from app.graph import build_graph
from app.telegram_client import send_message

app = Flask(__name__)
GRAPH = build_graph()

MAX_USERS_PER_TICK = 3
MAX_EMAILS_PER_USER = 5


def _authorized(req) -> bool:
    if not config.CRON_SECRET:
        return False
    return hmac.compare_digest(req.headers.get("Authorization", ""), f"Bearer {config.CRON_SECRET}")


def _load_profile(user_id: str):
    role = query(
        "select hr_enabled, care_enabled from job_roles where user_id = %s", (user_id,)
    )
    details = query(
        "select company_name, company_overview, faqs from details where user_id = %s", (user_id,)
    )
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


def run_tick():
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
def handler():
    if not _authorized(request):
        return jsonify({"error": {"code": "unauthorized", "message": "Invalid cron secret."}}), 401
    result = run_tick()
    return jsonify({"ok": True, **result})
