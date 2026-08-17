from flask import Blueprint, send_from_directory, abort

from file_utils import UPLOAD_ROOT

files_bp = Blueprint("files", __name__, url_prefix="/files")


@files_bp.route("/invoices/<path:filename>", methods=["GET"])
def get_invoice(filename):
    try:
        return send_from_directory(UPLOAD_ROOT, filename)
    except Exception:
        abort(404)