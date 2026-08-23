from functools import wraps
from flask import request, jsonify
from flask_jwt_extended import get_jwt, verify_jwt_in_request

def role_required(required_role):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            # Allow OPTIONS requests (CORS preflight) to pass without auth
            if request.method == 'OPTIONS':
                return f(*args, **kwargs)
            try:
                verify_jwt_in_request()
                claims = get_jwt()
                user_role = claims.get('role')
                if user_role != required_role:
                    return jsonify({"message": "Insufficient permissions."}), 403
            except Exception:
                return jsonify({"message": "Invalid or missing token."}), 401
            return f(*args, **kwargs)
        return decorated
    return decorator