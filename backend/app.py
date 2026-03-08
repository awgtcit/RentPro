"""Flask application factory — registers extensions, blueprints, error handlers, and security headers."""

import os
from flask import Flask, jsonify
from config import config_by_name
from extensions import db, migrate, jwt, cors, limiter


def create_app(config_name=None):
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')

    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])

    # ── Extensions ──────────────────────────────────────────────
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": ["http://localhost:3000", "http://localhost:8081", "http://localhost:8082", "http://10.0.2.2:5000", "http://192.168.0.10:5000", "exp://*"]}})
    limiter.init_app(app)

    # ── Ensure upload folder exists ─────────────────────────────
    upload_dir = app.config['UPLOAD_FOLDER']
    os.makedirs(upload_dir, exist_ok=True)

    # ── Security headers ────────────────────────────────────────
    @app.after_request
    def set_security_headers(response):
        for header, value in app.config.get('SECURE_HEADERS', {}).items():
            response.headers[header] = value
        return response

    # ── JWT error handlers ──────────────────────────────────────
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({"error": "Token has expired", "code": "TOKEN_EXPIRED"}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({"error": "Invalid token", "code": "TOKEN_INVALID"}), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({"error": "Authorization token required", "code": "TOKEN_MISSING"}), 401

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return jsonify({"error": "Token has been revoked", "code": "TOKEN_REVOKED"}), 401

    # ── Global error handlers ───────────────────────────────────
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"error": str(e.description), "code": "BAD_REQUEST"}), 400

    @app.errorhandler(403)
    def forbidden(e):
        return jsonify({"error": "Access denied", "code": "FORBIDDEN"}), 403

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Resource not found", "code": "NOT_FOUND"}), 404

    @app.errorhandler(422)
    def unprocessable(e):
        return jsonify({"error": str(e.description), "code": "VALIDATION_ERROR"}), 422

    @app.errorhandler(429)
    def rate_limit(e):
        return jsonify({"error": "Rate limit exceeded", "code": "RATE_LIMITED"}), 429

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"error": "Internal server error", "code": "INTERNAL_ERROR"}), 500

    # ── Model serializers (attaches to_dict to all models) ─────
    import serializers  # noqa: F401

    # ── Register blueprints ─────────────────────────────────────
    from routes import register_blueprints
    register_blueprints(app)

    # ── Health check ────────────────────────────────────────────
    @app.route('/api/health')
    def health():
        return jsonify({"status": "ok", "app": app.config['APP_NAME'], "version": app.config['APP_VERSION']})

    return app


if __name__ == '__main__':
    application = create_app()
    application.run(host='0.0.0.0', port=5000)
