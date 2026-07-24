import uuid
from app.database.session import SessionLocal
from app.database.models import User, UserType
from app.features.auth.services import get_current_user
from app.features.admin.router import reply_to_user_support_chat, SupportAdminReplyRequest, get_user_support_chat_history

def test_reply():
    db = SessionLocal()
    try:
        print("🚀 Testing admin reply with DB persistence...")
        # Get admin user from get_current_user logic or db
        admin_user = db.query(User).filter(User.user_type == UserType.ADMIN).first()
        if not admin_user:
            admin_user = User(
                id=uuid.UUID("00000000-0000-0000-0000-000000000000"),
                email="admin@shabbat.com",
                full_name="Admin",
                user_type=UserType.ADMIN
            )

        target_user = db.query(User).filter(User.user_type != UserType.ADMIN).first()
        if not target_user:
            print("No regular user found")
            return

        res = reply_to_user_support_chat(
            target_user_id=str(target_user.id),
            payload=SupportAdminReplyRequest(content="הכל טוב אנחנו על זה"),
            admin_user=admin_user,
            db=db
        )
        print("✅ SUCCESS! Reply created without ForeignKeyViolation:", res)

        history = get_user_support_chat_history(
            target_user_id=str(target_user.id),
            admin_user=admin_user,
            db=db
        )
        print(f"✅ SUCCESS! History retrieved: {len(history)} messages")
    except Exception as e:
        print("❌ Error:", e)
        import traceback
        traceback.print_exc()
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    test_reply()
