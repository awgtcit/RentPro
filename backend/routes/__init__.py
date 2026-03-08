"""Blueprint registration — imports all route modules and registers them with the app."""


def register_blueprints(app):
    from routes.auth_routes import auth_bp
    from routes.user_routes import user_bp
    from routes.property_routes import property_bp
    from routes.tenant_routes import tenant_bp
    from routes.assignment_routes import assignment_bp
    from routes.invoice_routes import invoice_bp
    from routes.payment_routes import payment_bp
    from routes.dashboard_routes import dashboard_bp
    from routes.report_routes import report_bp
    from routes.deposit_routes import deposit_bp
    from routes.maintenance_routes import maintenance_bp
    from routes.settings_routes import settings_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(user_bp, url_prefix='/api/users')
    app.register_blueprint(property_bp, url_prefix='/api')
    app.register_blueprint(tenant_bp, url_prefix='/api/tenants')
    app.register_blueprint(assignment_bp, url_prefix='/api/assignments')
    app.register_blueprint(invoice_bp, url_prefix='/api/invoices')
    app.register_blueprint(payment_bp, url_prefix='/api/payments')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(report_bp, url_prefix='/api/reports')
    app.register_blueprint(deposit_bp, url_prefix='/api/deposits')
    app.register_blueprint(maintenance_bp, url_prefix='/api/maintenance')
    app.register_blueprint(settings_bp, url_prefix='/api/settings')
