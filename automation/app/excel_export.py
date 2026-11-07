from io import BytesIO

from openpyxl import Workbook

from app.db import query


def build_report(user_id: str) -> bytes:
    wb = Workbook()

    emails_ws = wb.active
    emails_ws.title = "Emails"
    emails_ws.append(["Received", "Sender", "Subject", "Priority", "Category", "Status", "Summary"])
    for row in query(
        """select received_at, sender_name, subject, priority, category, status, summary
             from email_activity where user_id = %s order by received_at desc""",
        (user_id,),
    ):
        emails_ws.append([
            row["received_at"].strftime("%Y-%m-%d %H:%M") if row["received_at"] else "",
            row["sender_name"], row["subject"], row["priority"], row["category"], row["status"], row["summary"],
        ])

    cand_ws = wb.create_sheet("Candidates")
    cand_ws.append(["Received", "Name", "Role", "Experience", "Education", "Recommendation"])
    for row in query(
        """select received_at, candidate_name, role, experience, education, recommendation
             from candidates where user_id = %s order by received_at desc""",
        (user_id,),
    ):
        cand_ws.append([
            row["received_at"].strftime("%Y-%m-%d %H:%M") if row["received_at"] else "",
            row["candidate_name"], row["role"], row["experience"], row["education"], row["recommendation"],
        ])

    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()
