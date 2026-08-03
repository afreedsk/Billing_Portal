from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt, verify_jwt_in_request


def role_required(*allowed_roles):
    """Decorator to restrict an endpoint to specific roles.
    SuperAdmin is always allowed through, in addition to any listed roles.
    Usage: @role_required("IT")  or  @role_required("IT", "PCM")
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            role = claims.get("role")
            if role == "SuperAdmin" or role in allowed_roles:
                return fn(*args, **kwargs)
            return jsonify({"message": "You do not have permission to access this resource."}), 403
        return wrapper
    return decorator
