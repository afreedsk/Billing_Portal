# backend/routes/auth.py
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity

from models import db, User

# ---------- Blueprint definition ----------
auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

# In-memory fallback for OTP (used if Redis is unavailable)
TEMP_2FA_STORE = {}

# ---------- Email helper ----------
def send_otp_email(user_email, otp_code, purpose="verification"):
    """Send OTP via SMTP, fallback to console."""
    config = current_app.config
    subject = f"Your Finance Hub {purpose} code"
    body = f"Your OTP code is: {otp_code}. It expires in 10 minutes."

    # Always print to console for debugging
    print(f"\n🔑 OTP for {user_email}: {otp_code}\n")

    # Attempt SMTP
    try:
        msg = MIMEMultipart()
        msg['From'] = config.get('MAIL_USERNAME')
        msg['To'] = user_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP_SSL(config.get('MAIL_SERVER'), config.get('MAIL_PORT'))
        server.login(config.get('MAIL_USERNAME'), config.get('MAIL_PASSWORD'))
        server.sendmail(config.get('MAIL_USERNAME'), user_email, msg.as_string())
        server.quit()
        print(f"✅ Email sent to {user_email}")
        return True
    except Exception as e:
        print(f"❌ Email send failed: {e}")
        return False

# ---------- Redis cache helper ----------
def get_cache():
    return current_app.config.get("REDIS_CLIENT") or current_app.config.get("CACHE_CLIENT")

# ---------- LOGIN (with 2FA) ----------
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"message": "Email and password are required."}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"message": "Invalid email or password."}), 401

    if not user.is_active:
        return jsonify({"message": "Account disabled."}), 403

    # 2FA for Admin / SuperAdmin
    if user.role.lower() in ["admin", "superadmin", "it"]:
        temp_token = secrets.token_urlsafe(32)
        otp_code = f"{secrets.randbelow(1000000):06d}"
        TEMP_2FA_STORE[temp_token] = {"user_id": user.id, "otp": otp_code}
        send_otp_email(user.email, otp_code, "login")
        return jsonify({
            "success": True,
            "requires_2fa": True,
            "temp_token": temp_token
        }), 200

    additional_claims = {"role": user.role, "name": user.name}
    access_token = create_access_token(identity=str(user.id), additional_claims=additional_claims)
    return jsonify({
        "access_token": access_token,
        "user": user.to_dict(),
    }), 200

# ---------- VERIFY OTP (2FA) ----------
@auth_bp.route("/verify-otp", methods=["POST"])
def verify_otp():
    data = request.get_json(silent=True) or {}
    temp_token = data.get("temp_token")
    otp = data.get("otp")
    if not temp_token or not otp:
        return jsonify({"message": "Temp token and OTP are required."}), 400

    temp_data = TEMP_2FA_STORE.get(temp_token)
    if not temp_data:
        return jsonify({"message": "Invalid or expired 2FA session."}), 401
    if temp_data["otp"] != otp:
        return jsonify({"message": "Incorrect verification code."}), 401

    user = User.query.get(temp_data["user_id"])
    if not user:
        return jsonify({"message": "User not found."}), 404
    if not user.is_active:
        return jsonify({"message": "Account disabled."}), 403

    del TEMP_2FA_STORE[temp_token]
    additional_claims = {"role": user.role, "name": user.name}
    access_token = create_access_token(identity=str(user.id), additional_claims=additional_claims)
    return jsonify({
        "access_token": access_token,
        "user": user.to_dict(),
    }), 200

# ---------- FORGOT PASSWORD – Send OTP ----------
@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    if not email:
        return jsonify({"message": "Email is required."}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        # Security: don't reveal existence
        return jsonify({"message": "If that email is registered, an OTP has been sent."}), 200

    otp_code = f"{secrets.randbelow(1000000):06d}"
    cache = get_cache()
    if cache:
        cache.setex(f"reset_otp:{email}", 600, otp_code)
    else:
        TEMP_2FA_STORE[f"reset_{email}"] = otp_code

    send_otp_email(email, otp_code, "password reset")
    return jsonify({"message": "OTP sent to your email."}), 200

# ---------- RESET PASSWORD – Verify OTP & update ----------
@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    otp = data.get("otp")
    new_password = data.get("new_password") or ""

    if not email or not otp or not new_password:
        return jsonify({"message": "Email, OTP, and new password are required."}), 400
    if len(new_password) < 6:
        return jsonify({"message": "Password must be at least 6 characters."}), 400

    cache = get_cache()
    stored_otp = None
    if cache:
        stored_otp = cache.get(f"reset_otp:{email}")
    else:
        stored_otp = TEMP_2FA_STORE.get(f"reset_{email}")

    print(f"🔍 Debug: stored_otp for {email} = {stored_otp}, provided otp = {otp}")

    if not stored_otp:
        return jsonify({"message": "OTP expired or not found. Please request a new one."}), 400
    if stored_otp != otp:
        return jsonify({"message": "Invalid OTP."}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"message": "User not found."}), 404

    user.set_password(new_password)
    db.session.commit()

    # Clean up
    if cache:
        cache.delete(f"reset_otp:{email}")
    else:
        TEMP_2FA_STORE.pop(f"reset_{email}", None)

    return jsonify({"message": "Password reset successfully. Please log in."}), 200

# ---------- ME ----------
@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found."}), 404
    return jsonify({"user": user.to_dict()}), 200
