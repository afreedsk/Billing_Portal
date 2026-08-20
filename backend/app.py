from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from config import Config
from models import db


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    JWTManager(app)
    CORS(app, resources={r"/api/*": {"origins": app.config["FRONTEND_ORIGIN"]}}, supports_credentials=True)

    from routes.auth import auth_bp
    from routes.it import it_bp
    from routes.pcm import pcm_bp
    from routes.medtech import medtech_bp
    from routes.caredx import caredx_bp
    from routes.superadmin import superadmin_bp
    from routes.files import files_bp
    from routes.corporate import corporate_bp
    from routes.adminfunctionalunit import adminfunctionalunit_bp
    from routes.researchdevelopment import researchdevelopment_bp


    app.register_blueprint(auth_bp)
    app.register_blueprint(it_bp)
    app.register_blueprint(pcm_bp)
    app.register_blueprint(medtech_bp)
    app.register_blueprint(caredx_bp)
    app.register_blueprint(superadmin_bp)
    app.register_blueprint(files_bp)
    app.register_blueprint(corporate_bp)
    app.register_blueprint(adminfunctionalunit_bp)
    app.register_blueprint(researchdevelopment_bp)

    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok"}), 200

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"message": "Route not found."}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"message": "Internal server error."}), 500

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
