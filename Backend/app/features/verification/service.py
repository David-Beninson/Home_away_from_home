import os
import re
import base64
import uuid
import asyncio
import random
from typing import Tuple, Optional
from fastapi import UploadFile, HTTPException, status, Response
from sqlalchemy.orm import Session
from app.database.models.user import User, UserVerificationStatus, UserType
from app.database.models.verification import VerificationRequest, VerificationType, VerificationStatus

UPLOAD_DIR = os.path.join(os.getcwd(), "uploads", "verifications")
os.makedirs(UPLOAD_DIR, exist_ok=True)

async def verify_documents_mock(
    db: Session,
    user: User,
    selfie_file: UploadFile,
    document_file: UploadFile,
    verification_type: VerificationType,
    secondary_document_file: Optional[UploadFile] = None
) -> VerificationRequest:
    """
    Simulates document processing pipeline:
    1. Reads selfie, ID, and optional secondary doc files into memory, encodes as Base64 Data URIs.
    2. Stores image data directly into PostgreSQL database table `verification_requests`.
    3. Executes 3-second sleep simulating computer vision model scanning.
    4. Calculates mock confidence score.
    5. Sets user verification_status to PENDING_ADMIN.
    """
    # 1. Read files and convert to Base64 Data URIs directly for Database storage
    selfie_bytes = await selfie_file.read()
    doc_bytes = await document_file.read()

    selfie_ext = os.path.splitext(selfie_file.filename or "")[1] or ".jpg"
    doc_ext = os.path.splitext(document_file.filename or "")[1] or ".jpg"

    selfie_mime = selfie_file.content_type or "image/jpeg"
    doc_mime = document_file.content_type or "image/jpeg"

    selfie_b64 = f"data:{selfie_mime};base64,{base64.b64encode(selfie_bytes).decode('utf-8')}"
    doc_b64 = f"data:{doc_mime};base64,{base64.b64encode(doc_bytes).decode('utf-8')}"

    selfie_filename = f"db_selfie_{user.id}_{uuid.uuid4().hex[:8]}{selfie_ext}"
    doc_filename = f"db_doc_{user.id}_{uuid.uuid4().hex[:8]}{doc_ext}"

    sec_filename = None
    sec_b64 = None
    if secondary_document_file:
        sec_bytes = await secondary_document_file.read()
        sec_ext = os.path.splitext(secondary_document_file.filename or "")[1] or ".jpg"
        sec_mime = secondary_document_file.content_type or "image/jpeg"
        sec_b64 = f"data:{sec_mime};base64,{base64.b64encode(sec_bytes).decode('utf-8')}"
        sec_filename = f"db_sec_doc_{user.id}_{uuid.uuid4().hex[:8]}{sec_ext}"
        try:
            with open(os.path.join(UPLOAD_DIR, sec_filename), "wb") as f:
                f.write(sec_bytes)
        except Exception as e:
            print(f"Disk fallback warning: {e}")

    # Also save fallback to disk for backwards compatibility
    try:
        with open(os.path.join(UPLOAD_DIR, selfie_filename), "wb") as f:
            f.write(selfie_bytes)
        with open(os.path.join(UPLOAD_DIR, doc_filename), "wb") as f:
            f.write(doc_bytes)
    except Exception as e:
        print(f"Disk fallback warning: {e}")

    # 2. Simulate AI Processing Delay (3 seconds)
    user.verification_status = UserVerificationStatus.PENDING_AI
    db.commit()

    await asyncio.sleep(3)

    # 3. Generate mock AI confidence score
    ai_score = round(random.uniform(82.0, 96.0), 1)

    # 4. Save/update verification request directly in Database
    v_req = db.query(VerificationRequest).filter(
        VerificationRequest.user_id == user.id
    ).order_by(VerificationRequest.created_at.desc()).first()

    if not v_req or v_req.status in [VerificationStatus.APPROVED, VerificationStatus.REJECTED]:
        v_req = VerificationRequest(
            user_id=user.id,
            selfie_image_path=selfie_filename,
            document_image_path=doc_filename,
            secondary_document_image_path=sec_filename,
            selfie_image_data=selfie_b64,
            document_image_data=doc_b64,
            secondary_document_image_data=sec_b64,
            verification_type=verification_type,
            status=VerificationStatus.PENDING_ADMIN,
            ai_confidence_score=ai_score,
            rejection_reason=None
        )
        db.add(v_req)
    else:
        v_req.selfie_image_path = selfie_filename
        v_req.document_image_path = doc_filename
        v_req.secondary_document_image_path = sec_filename
        v_req.selfie_image_data = selfie_b64
        v_req.document_image_data = doc_b64
        v_req.secondary_document_image_data = sec_b64
        v_req.verification_type = verification_type
        v_req.status = VerificationStatus.PENDING_ADMIN
        v_req.ai_confidence_score = ai_score
        v_req.rejection_reason = None

    # Update User Status to PENDING_ADMIN
    user.verification_status = UserVerificationStatus.PENDING_ADMIN
    db.commit()
    db.refresh(v_req)
    db.refresh(user)

    # 5. Send live notification to Admin users
    try:
        from app.features.notifications.router import manager
        from datetime import datetime

        admin_users = db.query(User).filter(User.user_type == UserType.ADMIN).all()
        for admin in admin_users:
            asyncio.create_task(
                manager.send_personal_notification(
                    {
                        "id": f"verify_{v_req.id}",
                        "title": "בקשת אימות חדשה להמתנה 🪪",
                        "message": f"המשתמש {user.full_name} העלה מסמכים לאימות (ציון AI: {ai_score}%).",
                        "type": "alert",
                        "time": datetime.now().strftime("%H:%M")
                    },
                    str(admin.id)
                )
            )
    except Exception as e:
        print(f"Failed to dispatch admin notification: {e}")

    return v_req

def get_user_verification_status(db: Session, user: User) -> Tuple[UserVerificationStatus, Optional[VerificationRequest]]:
    v_req = db.query(VerificationRequest).filter(
        VerificationRequest.user_id == user.id
    ).order_by(VerificationRequest.created_at.desc()).first()
    return user.verification_status, v_req

def get_secure_file_response(filename: str, current_user: User, db: Session) -> Response:
    """Fetches image directly from PostgreSQL database with permission validation."""
    v_req = db.query(VerificationRequest).filter(
        (VerificationRequest.selfie_image_path == filename) |
        (VerificationRequest.document_image_path == filename) |
        (VerificationRequest.secondary_document_image_path == filename)
    ).first()

    if not v_req:
        # Disk fallback check
        file_path = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(file_path):
            with open(file_path, "rb") as f:
                return Response(content=f.read(), media_type="image/jpeg")
        raise HTTPException(status_code=404, detail="File not found")

    # Security check: Admin or file owner
    if current_user.user_type != UserType.ADMIN and current_user.id != v_req.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    if filename == v_req.selfie_image_path:
        raw_data = v_req.selfie_image_data
    elif filename == v_req.document_image_path:
        raw_data = v_req.document_image_data
    else:
        raw_data = v_req.secondary_document_image_data
    
    if not raw_data:
        # Fallback to disk if raw_data is empty
        file_path = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(file_path):
            with open(file_path, "rb") as f:
                return Response(content=f.read(), media_type="image/jpeg")
        raise HTTPException(status_code=404, detail="Image data missing in database")

    # Decode Base64 Data URI from PostgreSQL
    try:
        if raw_data.startswith("data:"):
            header, b64_str = raw_data.split(",", 1)
            mime_match = re.search(r"data:(.*?);base64", header)
            media_type = mime_match.group(1) if mime_match else "image/jpeg"
            img_bytes = base64.b64decode(b64_str)
            return Response(content=img_bytes, media_type=media_type)
        else:
            img_bytes = base64.b64decode(raw_data)
            return Response(content=img_bytes, media_type="image/jpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to decode DB image data: {e}")

