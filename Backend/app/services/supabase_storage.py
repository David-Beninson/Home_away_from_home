import os
import uuid
import logging
from typing import Optional
from supabase import create_client, Client
from app.core.config import settings

logger = logging.getLogger(__name__)

# Initialize Supabase client globally to reuse connection
supabase: Optional[Client] = None
if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
else:
    logger.warning("Supabase URL or Service Role Key is missing. Storage functions will fail.")

BUCKET_NAME = "verification-documents"

def upload_file(file_bytes: bytes, filename: str, content_type: str) -> str:
    """
    Uploads a file to the Supabase verification-documents bucket.
    Returns the file path in the bucket.
    """
    if not supabase:
        raise RuntimeError("Supabase client is not initialized.")
    
    file_extension = os.path.splitext(filename)[1]
    unique_filename = f"{uuid.uuid4().hex}{file_extension}"
    
    # Upload to Supabase
    try:
        res = supabase.storage.from_(BUCKET_NAME).upload(
            path=unique_filename,
            file=file_bytes,
            file_options={"content-type": content_type}
        )
    except Exception as e:
        logger.error(f"Supabase upload failed for {filename}: {type(e).__name__} - {str(e)}")
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail="Failed to upload file to storage. Please check bucket configuration.")
    
    # Return the generated file path
    return unique_filename

def get_signed_url(file_path: str, expires_in: int = 600) -> str:
    """
    Generates a signed URL for temporary access to a private file.
    Default expiration is 600 seconds (10 minutes).
    """
    if not supabase:
        raise RuntimeError("Supabase client is not initialized.")
        
    res = supabase.storage.from_(BUCKET_NAME).create_signed_url(file_path, expires_in)
    
    if "signedURL" in res:
        return res["signedURL"]
    
    # Fallback to older versions behavior or string return if signedURL is not a dict
    if isinstance(res, str):
        return res
    if hasattr(res, "signed_url"):
        return res.signed_url
        
    logger.error(f"Failed to generate signed URL for {file_path}, response: {res}")
    raise Exception("Could not generate signed URL")

def delete_file(file_path: str) -> bool:
    """
    Permanently deletes a file from the Supabase bucket.
    """
    if not supabase:
        logger.error("Supabase client is not initialized. Cannot delete file.")
        return False
        
    try:
        supabase.storage.from_(BUCKET_NAME).remove([file_path])
        return True
    except Exception as e:
        logger.error(f"Failed to delete file {file_path} from Supabase: {e}")
        return False
