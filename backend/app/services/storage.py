import os
import uuid
from fastapi import UploadFile, HTTPException
from google.cloud import storage
from google.api_core import exceptions

from app.core.config import settings


class StorageService:
    """Service for handling file uploads to Google Cloud Storage or local storage"""
    
    def __init__(self):
        """Initialize the storage service with GCP credentials"""
        if settings.GCP_PROJECT_ID and settings.GCP_CREDENTIALS_FILE:
            try:
                self.storage_client = storage.Client.from_service_account_json(
                    settings.GCP_CREDENTIALS_FILE
                )
                self.bucket = self.storage_client.bucket(settings.GCP_BUCKET_NAME)
                self.gcs_available = True
            except Exception as e:
                print(f"Error initializing GCP client: {str(e)}")
                self.gcs_available = False
        else:
            self.gcs_available = False
            
        # Create local directory for uploads if GCS isn't available
        os.makedirs("./uploads/csv", exist_ok=True)
        os.makedirs("./uploads/icons", exist_ok=True)
    
    async def _validate_icon_file(self, file: UploadFile) -> None:
        """Validate that the uploaded file is an allowed image format and size"""
        # Check file extension
        ext = file.filename.split(".")[-1].lower()
        if ext not in settings.ALLOWED_ICON_EXTENSIONS:
            raise HTTPException(
                status_code=400, 
                detail=f"File type not allowed. Allowed types: {', '.join(settings.ALLOWED_ICON_EXTENSIONS)}"
            )
        
        # Check file size
        contents = await file.read()
        await file.seek(0)  # Reset file position after reading
        
        if len(contents) > settings.MAX_ICON_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File size exceeds maximum allowed ({settings.MAX_ICON_SIZE/1024/1024}MB)"
            )
    
    async def upload_icon(self, file: UploadFile) -> str:
        """Upload an icon file to storage and return the URL"""
        await self._validate_icon_file(file)
        
        # Generate a unique filename
        ext = file.filename.split(".")[-1].lower()
        filename = f"{uuid.uuid4()}.{ext}"
        file_key = f"icons/{filename}"
        
        if self.gcs_available:
            try:
                contents = await file.read()
                blob = self.bucket.blob(file_key)
                blob.upload_from_string(
                    contents,
                    content_type=f"image/{ext}"
                )
                return f"https://storage.googleapis.com/{settings.GCP_BUCKET_NAME}/{file_key}"
            except exceptions.GoogleAPIError as e:
                raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")
        else:
            # Local file storage
            file_path = f"./uploads/{file_key}"
            contents = await file.read()
            with open(file_path, "wb") as f:
                f.write(contents)
            return f"/uploads/{file_key}"
    
    async def upload_csv(self, file: UploadFile, token_id: int) -> str:
        """Upload a CSV file to storage and return the file path"""
        # Generate a unique filename based on token ID
        filename = f"token_{token_id}_{uuid.uuid4()}.csv"
        file_key = f"csv/{filename}"
        
        if self.gcs_available:
            try:
                contents = await file.read()
                blob = self.bucket.blob(file_key)
                blob.upload_from_string(
                    contents,
                    content_type="text/csv"
                )
                return f"gs://{settings.GCP_BUCKET_NAME}/{file_key}"
            except exceptions.GoogleAPIError as e:
                raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")
        else:
            # Local file storage
            file_path = f"./uploads/{file_key}"
            contents = await file.read()
            with open(file_path, "wb") as f:
                f.write(contents)
            return file_path


# Create a singleton instance
storage_service = StorageService() 