from functools import wraps
from flask import request, jsonify
from flask_jwt_extended import get_jwt, verify_jwt_in_request, get_jwt_identity
from models import User

def role_required(required_role):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            # Allow OPTIONS requests (CORS preflight) to pass without auth
            if request.method == 'OPTIONS':
                return f(*args, **kwargs)
            try:
                verify_jwt_in_request()
                identity = get_jwt_identity()
                if identity is None:
                    return jsonify({"message": "Invalid token."}), 401
                user = User.query.get(identity)
                if user is None:
                    return jsonify({"message": "User not found."}), 401
                # SuperAdmin can access any route
                if user.role == "SuperAdmin":
                    return f(*args, **kwargs)
                if user.role != required_role:
                    return jsonify({"message": "Insufficient permissions."}), 403
            except Exception:
                return jsonify({"message": "Invalid or missing token."}), 401
            return f(*args, **kwargs)
        return decorated
    return decorator