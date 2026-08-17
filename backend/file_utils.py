import os
import uuid

ALLOWED_INVOICE_EXTENSIONS = {"pdf", "jpg", "jpeg", "png", "doc", "docx"}

UPLOAD_ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads", "invoices")


def _allowed_file(filename):
    if "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[-1].lower()
    return ext in ALLOWED_INVOICE_EXTENSIONS


def save_invoice_file(file_storage, department):

    if not file_storage or not file_storage.filename:
        return None, None, None

    if not _allowed_file(file_storage.filename):
        raise ValueError("Invoice must be a PDF, image (JPG/PNG), or Word document (DOC/DOCX).")

    ext = file_storage.filename.rsplit(".", 1)[-1].lower()
    dept_dir = os.path.join(UPLOAD_ROOT, department)
    os.makedirs(dept_dir, exist_ok=True)

    stored_name = f"{uuid.uuid4().hex}.{ext}"
    file_storage.save(os.path.join(dept_dir, stored_name))

    relative_path = f"{department}/{stored_name}"
    return relative_path, file_storage.filename, file_storage.mimetype


def delete_invoice_file(relative_path):
    if not relative_path:
        return
    full_path = os.path.join(UPLOAD_ROOT, relative_path)
    if os.path.exists(full_path):
        try:
            os.remove(full_path)
        except OSError:
            pass    