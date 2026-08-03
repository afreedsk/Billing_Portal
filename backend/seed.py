from app import create_app
from models import db, User

DEMO_USERS = [
    {"name": "Alice SuperAdmin", "email": "superadmin@primaria.com", "password": "Primaria@123", "role": "SuperAdmin", "department": "Administration"},
    {"name": "Ian IT",           "email": "it@primaria.com",         "password": "Primaria@123",   "role": "IT",         "department": "IT"},
    {"name": "Priya PCM",        "email": "pcm@primaria.com",        "password": "Primaria@123",  "role": "PCM",        "department": "PCM"},
    {"name": "Mark MedTech",     "email": "medtech@primaria.com",    "password": "Primaria@123",  "role": "MedTech",    "department": "MedTech"},
    {"name": "Cara Caredx",      "email": "caredx@primaria.com",     "password": "Primaria@123",  "role": "Caredx",     "department": "Caredx"},
]

app = create_app()

with app.app_context():
    db.create_all()
    print("Tables created (if they did not already exist).")

    for u in DEMO_USERS:
        existing = User.query.filter_by(email=u["email"]).first()
        if existing:
            print(f"Skipping {u['email']} (already exists).")
            continue
        user = User(name=u["name"], email=u["email"], role=u["role"], department=u["department"])
        user.set_password(u["password"])
        db.session.add(user)
        print(f"Created {u['role']} user -> {u['email']} / {u['password']}")

    db.session.commit()
    print("\nSeeding complete. You can now log in with any of the accounts above.")
