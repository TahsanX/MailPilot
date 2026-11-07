import jwt
from flask import Flask, Response, request

from app.config import config
from app.excel_export import build_report

app = Flask(__name__)


@app.route("/api/export", methods=["GET"])
def handler():
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
