from flask import Blueprint, send_from_directory, abort, request, jsonify
from flask_jwt_extended import decode_token

from file_utils import UPLOAD_ROOT

files_bp = Blueprint("files", __name__, url_prefix="/files")

@files_bp.route("/invoices/<path:filename>", methods=["GET"])
def get_invoice(filename):
    # 1. Try to get token from Authorization header (for API calls)
    auth_header = request.headers.get("Authorization")
    token = None
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    
    # 2. Fallback: Get token from ?token= query string
    if not token:
        token = request.args.get("token")
    
    # 3. Fallback: Get token from ?jwt= query string
    if not token:
        token = request.args.get("jwt")

    # 4. Fallback: Check ANY query parameter containing "token"
    if not token:
        for key, value in request.args.items():
            if "token" in key.lower():
                token = value
                break

    # 5. If no token found, return 401
    if not token:
        return jsonify({"msg": "Missing token. Please hard refresh your browser."}), 401

    # 6. Validate token manually
    try:
        decode_token(token)
    except Exception:
        return jsonify({"msg": "Invalid or expired token."}), 401

    # 7. Serve the file
    try:
        return send_from_directory(UPLOAD_ROOT, filename)
    except Exception:
        abort(404)