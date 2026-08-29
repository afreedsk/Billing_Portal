from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

ROLES = ["SuperAdmin", "admin", "IT", "IT Sales", "PCM", "MedTech", "Caredx", "Corporate", "Adminstrationfunctionalunit", "ResearchDevelopment", "Dental"]
ENTRY_TYPES = ["Income", "Expenses"]

DEPARTMENT_CONFIG = {
    "IT": {
        "categories": {
            "Income": ["Web Services", "Portal Services", "Others"],
            "Expenses": [
                "Payroll Salaries",
                "Travel & Entertainment",
                "Marketing Expenses",
                "Assets & Infra Cost",
                "General Operations",
                "Innovation",
                "Miscellaneous Categories",
                "Service Revenue",
                "Supplies and Equipments",
                "Legal Governance",
                "Guest Concierge",
                "Office Management",
                "Other"
            ]
        },
        "revenue_types": ["Subscription", "One-Time", "Renewal", "Maintenance", "Other"],
        "show_generated_by": True,
        "show_revenue_type": True,
        "show_patient_fields": False,
        "show_client_name": True,
        "show_gst_number": False,
        "gst_required_categories": [],
        "show_items": False,
        "show_invoice": True,
        "show_gst_tax": False,
        "show_tax_invoice_number": False,
    },

    "IT Sales": {
        "categories": {
            "Income": [
                "Hardware Sales",
                "Consulting",
                "Support & Maintenance",
                "Service Revenue",
                "Internal allocations",
                "Others"
            ],
            "Expenses": [
                "Payroll Salaries",
                "Travel & Entertainment",
                "Marketing Expenses",
                "Assets & Infra Cost",
                "General Operations",
                "Innovation",
                "Miscellaneous Categories",
                "Service Revenue",
                "Supplies and Equipments",
                "Legal Governance",
                "Guest Concierge",
                "Office Management",
                "Consulting",
                "Management Fees",
                "Hardware Sales",
                "Other"
            ]
        },
        "revenue_types": ["Direct", "Recurring", "Project-based"],
        "show_generated_by": True,
        "show_revenue_type": True,
        "show_patient_fields": False,
        "show_client_name": True,
        "show_gst_number": True,
        "gst_required_categories": ["Hardware Sales"],
        "show_items": False,
        "show_invoice": True,
        "show_gst_tax": True,
        "show_tax_invoice_number": True,
    },

    "Dental": {
        "categories": {
            "Income": ["Consulting", "Other"],
            "Expenses": ["Salaries", "Supplies", "Equipment", "Payroll Salaries", "Other"],
        },
        "revenue_types": [],
        "show_generated_by": False,
        "show_revenue_type": False,
        "show_patient_fields": False,
        "show_client_name": False,
        "show_gst_number": False,
        "gst_required_categories": [],
        "show_items": False,
        "show_invoice": False,
        "show_gst_tax": False,
        "show_tax_invoice_number": False,
        "is_salary_category": "Payroll Salaries",
        "exec_departments": ["Dental"],
    },

    "Caredx": {
        "categories": {
            "Income": ["Lab", "Camp", "Walkin/Person", "Referral"],
            "Expenses": [
                "Payroll Salaries",
                "Travel & Entertainment",
                "Marketing Expenses",
                "Assets & Infra Cost",
                "General Operations",
                "Innovation",
                "Miscellaneous Categories",
                "Service Revenue",
                "Supplies & Equipments",
                "Legal Governance",
                "Reagents and Laboratory Consumables",
                "Specialized Clinical Labor",
                "Logistics, Couriers, and Specimen Collection",
                "Equipment Maintenance, Leases, and Automation",
                "Waste Management, Compliance, and Safety",
                "Billing, Revenue Cycle, and Administration",
                "Other"
            ],
        },
        "revenue_types": ["Direct", "Recurring"],
        "show_generated_by": False,
        "show_revenue_type": True,
        "show_patient_fields": False,
        "show_client_name": False,
        "show_gst_number": False,
        "gst_required_categories": [],
        "show_items": False,
        "show_invoice": False,
        "show_gst_tax": False,
        "show_tax_invoice_number": False,
    },

    "PCM": {
        "categories": {
            "Income": [
                "Field Labor and Nursing Care",
                "Travel and Mileage Reimbursement",
                "Point-of-Care Technology and Telecom",
                "Home Medical Supplies and DME",
                "Intake, Scheduling, and Back-Office Logistics",
                "Regulatory and Risk Management"
            ],
            "Expenses": [
                "Payroll Salaries",
                "Travel & Entertainment",
                "Marketing Expenses",
                "Assets & Infra Cost",
                "General Operations",
                "Innovation",
                "Miscellaneous Categories",
                "Service Revenue",
                "Supplies and Equipments",
                "Legal Governance",
                "Guest Concierge",
                "Office Management",
                "Other"
            ]
        },
        "revenue_types": [],
        "show_generated_by": False,
        "show_revenue_type": False,
        "show_patient_fields": True,
        "show_client_name": False,
        "show_gst_number": False,
        "gst_required_categories": [],
        "show_items": False,
        "show_invoice": False,
        "show_gst_tax": False,
        "show_tax_invoice_number": False,
    },

    "MedTech": {
        "categories": {
            "Income": ["B2B Revenue", "B2C Revenue"],
            "Expenses": [
                "Payroll Salaries",
                "Travel & Entertainment",
                "Marketing Expenses",
                "Assets & Infra Cost",
                "General Operations",
                "Innovation",
                "Miscellaneous Categories",
                "Service Revenue",
                "Supplies and Equipments",
                "Legal Governance",
                "Guest Concierge",
                "Office Management",
                "Other"
            ],
        },
        "revenue_types": ["Direct", "Recurring"],
        "show_generated_by": True,
        "show_revenue_type": True,
        "show_patient_fields": False,
        "show_client_name": True,
        "show_gst_number": True,
        "gst_required_categories": [],
        "show_items": True,
        "show_invoice": True,
        "show_gst_tax": True,
        "show_tax_invoice_number": True,
    },

    "Corporate": {
        "categories": {
            "Income": [
                "Consulting",
                "Management Fees",
                "Other"
            ],
            "Expenses": [
                "Payroll Salaries",
                "Travel & Entertainment",
                "Marketing Expenses",
                "Assets & Infra Cost",
                "General Operations",
                "Innovation",
                "Miscellaneous Categories",
                "Service Revenue",
                "Supplies and Equipments",
                "Legal Governance",
                "Guest Concierge",
                "Office Management"
            ]
        },
        "revenue_types": [],
        "show_generated_by": True,
        "show_revenue_type": False,
        "show_patient_fields": False,
        "show_client_name": True,
        "show_gst_number": False,
        "gst_required_categories": [],
        "show_items": False,
        "show_invoice": False,
        "show_gst_tax": False,
        "show_tax_invoice_number": False,
        "is_salary_category": "Payroll Salaries",
        "exec_departments": ["Corporate", "Caredx", "MedTech", "IT", "IT Sales", "PCM", "Dental"],
    },

    "Adminstrationfunctionalunit": {
        "categories": {
            "Income": ["Other"],
            "Expenses": [
                "Travel & Entertainment",
                "Marketing Expenses",
                "Assets & Infra Cost",
                "General Operations",
                "Innovation",
                "Miscellaneous Categories",
                "Service Revenue",
                "Supplies and Equipments",
                "Legal Governance",
                "Guest Concierge",
                "Office Management",
                "Management Fees",
                "Other"
            ],
        },
        "revenue_types": [],
        "show_generated_by": True,
        "show_revenue_type": False,
        "show_patient_fields": False,
        "show_client_name": False,
        "show_gst_number": False,
        "gst_required_categories": [],
        "show_items": False,
        "show_invoice": False,
        "show_gst_tax": False,
        "show_tax_invoice_number": False,
    },

    "ResearchDevelopment": {
        "categories": {
            "Income": ["Grants", "Funding", "Other"],
            "Expenses": [
                "R&D Salaries",
                "Lab Supplies",
                "Equipment",
                "Testing",
                "Other"
            ],
        },
        "revenue_types": [],
        "show_generated_by": True,
        "show_revenue_type": False,
        "show_patient_fields": False,
        "show_client_name": False,
        "show_gst_number": False,
        "gst_required_categories": [],
        "show_items": False,
        "show_invoice": False,
        "show_gst_tax": False,
        "show_tax_invoice_number": False,
    },
}

VALID_DEPARTMENTS = list(DEPARTMENT_CONFIG.keys())


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), nullable=False)
    department = db.Column(db.String(100), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    entries = db.relationship("FinanceEntry", backref="creator", lazy=True)

    def set_password(self, raw_password):
        self.password_hash = generate_password_hash(raw_password)

    def check_password(self, raw_password):
        return check_password_hash(self.password_hash, raw_password)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "department": self.department,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class FinanceEntry(db.Model):
    __tablename__ = "finance_entries"
    id = db.Column(db.Integer, primary_key=True)
    department = db.Column(db.String(50), nullable=False)
    entry_type = db.Column(db.String(20), nullable=False)
    category = db.Column(db.String(60), nullable=False)
    sub_category = db.Column(db.String(60), nullable=True)
    generated_by = db.Column(db.String(120), nullable=True)
    revenue_type = db.Column(db.String(50), nullable=True)
    patient_name = db.Column(db.String(150), nullable=True)
    patient_place = db.Column(db.String(150), nullable=True)
    client_name = db.Column(db.String(150), nullable=True)
    gst_number = db.Column(db.String(20), nullable=True)

    amount = db.Column(db.Numeric(14, 2), nullable=False)
    base_amount = db.Column(db.Numeric(14, 2), nullable=True)
    gst_tax_percent = db.Column(db.Numeric(5, 2), nullable=True)
    gst_tax_amount = db.Column(db.Numeric(14, 2), nullable=True, default=0)
    tax_invoice_number = db.Column(db.String(50), nullable=True)

    exec_department = db.Column(db.String(50), nullable=True)
    employee_name = db.Column(db.String(150), nullable=True)
    salary_amount = db.Column(db.Numeric(14, 2), nullable=True)
    allowance_amount = db.Column(db.Numeric(14, 2), nullable=True)
    
    vehicle_type = db.Column(db.String(100), nullable=True)
    purpose = db.Column(db.Text, nullable=True)

    team = db.Column(db.String(100), nullable=True)   # NEW

    remarks = db.Column(db.Text, nullable=True)

    invoice_filename = db.Column(db.String(255), nullable=True)
    invoice_original_name = db.Column(db.String(255), nullable=True)
    invoice_mimetype = db.Column(db.String(100), nullable=True)

    entry_date = db.Column(db.Date, nullable=False)

    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    extra_data = db.Column(db.JSON, nullable=True)

    items = db.relationship(
        "FinanceEntryItem",
        backref="entry",
        lazy=True,
        cascade="all, delete-orphan",
        order_by="FinanceEntryItem.id",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "department": self.department,
            "entry_type": self.entry_type,
            "category": self.category,
            "sub_category": self.sub_category,
            "generated_by": self.generated_by,
            "revenue_type": self.revenue_type,
            "patient_name": self.patient_name,
            "patient_place": self.patient_place,
            "client_name": self.client_name,
            "gst_number": self.gst_number,
            "amount": float(self.amount),
            "base_amount": float(self.base_amount) if self.base_amount is not None else None,
            "gst_tax_percent": float(self.gst_tax_percent) if self.gst_tax_percent is not None else None,
            "gst_tax_amount": float(self.gst_tax_amount) if self.gst_tax_amount is not None else None,
            "tax_invoice_number": self.tax_invoice_number,
            "exec_department": self.exec_department,
            "employee_name": self.employee_name,
            "salary_amount": float(self.salary_amount) if self.salary_amount is not None else None,
            "allowance_amount": float(self.allowance_amount) if self.allowance_amount is not None else None,
            "vehicle_type": self.vehicle_type,
            "purpose": self.purpose,
            "team": self.team,   # NEW
            "remarks": self.remarks,
            "invoice_url": f"/files/invoices/{self.invoice_filename}" if self.invoice_filename else None,
            "invoice_original_name": self.invoice_original_name,
            "invoice_mimetype": self.invoice_mimetype,
            "entry_date": self.entry_date.isoformat() if self.entry_date else None,
            "items": [i.to_dict() for i in self.items],
            "extra_data": self.extra_data,
            "created_by": self.creator.name if self.creator else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class FinanceEntryItem(db.Model):
    __tablename__ = "finance_entry_items"
    id = db.Column(db.Integer, primary_key=True)
    finance_entry_id = db.Column(db.Integer, db.ForeignKey("finance_entries.id", ondelete="CASCADE"), nullable=False)
    item_name = db.Column(db.String(200), nullable=False)
    quantity = db.Column(db.Numeric(12, 2), nullable=False, default=1)
    unit_price = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    amount = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "item_name": self.item_name,
            "quantity": float(self.quantity),
            "unit_price": float(self.unit_price),
            "amount": float(self.amount),
        }


class CaredxLabEntry(db.Model):
    __tablename__ = "caredx_lab_entries"
    id = db.Column(db.Integer, primary_key=True)
    entry_date = db.Column(db.Date, nullable=False)
    patient_name = db.Column(db.String(150), nullable=False)
    test_name = db.Column(db.String(255), nullable=False)
    total_amount_paid = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    employee_name = db.Column(db.String(150), nullable=True)
    cash = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    online = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    paid_to_other_labs = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    rmp = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    salaries_expense = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    expense_details = db.Column(db.Text, nullable=True)
    referral_by = db.Column(db.String(150), nullable=True)
    referral_amount = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    sales = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "entry_date": self.entry_date.isoformat() if self.entry_date else None,
            "patient_name": self.patient_name,
            "test_name": self.test_name,
            "total_amount_paid": float(self.total_amount_paid or 0),
            "employee_name": self.employee_name,
            "cash": float(self.cash or 0),
            "online": float(self.online or 0),
            "paid_to_other_labs": float(self.paid_to_other_labs or 0),
            "rmp": float(self.rmp or 0),
            "salaries_expense": float(self.salaries_expense or 0),
            "expense_details": self.expense_details,
            "referral_by": self.referral_by,
            "referral_amount": float(self.referral_amount or 0),
            "sales": float(self.sales or 0),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class CaredxExpense(db.Model):
    __tablename__ = "caredx_expenses"
    id = db.Column(db.Integer, primary_key=True)
    expense_date = db.Column(db.Date, nullable=False)
    category = db.Column(db.String(150), nullable=False)
    amount = db.Column(db.Numeric(14, 2), nullable=False)
    remarks = db.Column(db.Text, nullable=True)
    employee_name = db.Column(db.String(150), nullable=True)
    purpose = db.Column(db.Text, nullable=True)
    vehicle_type = db.Column(db.String(100), nullable=True)
    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "expense_date": self.expense_date.isoformat() if self.expense_date else None,
            "category": self.category,
            "amount": float(self.amount or 0),
            "remarks": self.remarks,
            "employee_name": self.employee_name,
            "purpose": self.purpose,
            "vehicle_type": self.vehicle_type,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }