from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

ROLES = ["SuperAdmin", "IT", "PCM", "MedTech", "Caredx"]
ENTRY_TYPES = ["Income", "Expenses"]

DEPARTMENT_CONFIG = {
    "IT": {
        "categories": {
            "Income": ["Web Services", "Portal Services", "Others"],
            "Expenses": ["Web Services", "Portal Services", "Others"],
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
    },
    "Caredx": {
        "categories": {
            "Income": ["Lab", "Camp", "Walkin/Person", "Referral"],
            "Expenses": ["Lab to Lab", "Lab Equipments/Chemicals", "Others"],
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
    },
    "PCM": {
        "categories": {
            # "Others" lets the person type a free-text category name in the
            # entry form instead of picking from the fixed list — see
            # routes/pcm.py, which resolves "Others" + other_category into
            # the actual stored category value.
            "Income": ["Aya", "Care Taker", "Nurse", "RMP", "Physico Care", "Others"],
            "Expenses": ["Aya", "Care Taker", "Nurse", "RMP", "Physico Care", "Others"],
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
    },
    "MedTech": {
        "categories": {
            "Income": ["Wholesale", "Retail", "D2C"],
            "Expenses": ["Wholesale", "Retail", "D2C"],
        },
        "revenue_types": ["Direct", "Recurring"],
        "show_generated_by": True,
        "show_revenue_type": True,
        "show_patient_fields": False,
        "show_client_name": True,
        "show_gst_number": True,
        "gst_required_categories": ["Wholesale"],
        "show_items": True,
        "show_invoice": True,
    },
}

VALID_DEPARTMENTS = list(DEPARTMENT_CONFIG.keys())


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(30), nullable=False)
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
    generated_by = db.Column(db.String(120), nullable=True)
    revenue_type = db.Column(db.String(50), nullable=True)
    patient_name = db.Column(db.String(150), nullable=True)
    patient_place = db.Column(db.String(150), nullable=True)
    client_name = db.Column(db.String(150), nullable=True)
    gst_number = db.Column(db.String(20), nullable=True)
    amount = db.Column(db.Numeric(14, 2), nullable=False)
    remarks = db.Column(db.Text, nullable=True)

    invoice_filename = db.Column(db.String(255), nullable=True)
    invoice_original_name = db.Column(db.String(255), nullable=True)
    invoice_mimetype = db.Column(db.String(100), nullable=True)

    entry_date = db.Column(db.Date, nullable=False)

    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

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
            "generated_by": self.generated_by,
            "revenue_type": self.revenue_type,
            "patient_name": self.patient_name,
            "patient_place": self.patient_place,
            "client_name": self.client_name,
            "gst_number": self.gst_number,
            "amount": float(self.amount),
            "remarks": self.remarks,
            "invoice_url": f"/files/invoices/{self.invoice_filename}" if self.invoice_filename else None,
            "invoice_original_name": self.invoice_original_name,
            "invoice_mimetype": self.invoice_mimetype,
            "entry_date": self.entry_date.isoformat() if self.entry_date else None,
            "items": [i.to_dict() for i in self.items],
            "created_by": self.creator.name if self.creator else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class FinanceEntryItem(db.Model):
    __tablename__ = "finance_entry_items"

    id = db.Column(db.Integer, primary_key=True)
    finance_entry_id = db.Column(
        db.Integer,
        db.ForeignKey("finance_entries.id", ondelete="CASCADE"),
        nullable=False,
    )
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
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }