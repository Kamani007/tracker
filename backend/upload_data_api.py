"""
Upload Data API Module
Handles file upload functionality to Azure Blob Storage
"""
import os
import requests
import logging
from datetime import datetime
from flask import jsonify, request
from dotenv import load_dotenv
from werkzeug.utils import secure_filename

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class UploadDataAPI:
    """Upload Data API class handling file uploads to Azure Blob Storage"""

    def __init__(self):
        self.azure_container_url = os.getenv('AZURE_CONTAINER_URL')
        self.azure_container_sas = os.getenv('AZURE_CONTAINER_SAS')
        self.allowed_extensions = {'csv', 'xlsx', 'xls', 'json', 'txt'}

    def _is_allowed_file(self, filename):
        """Check if file extension is allowed"""
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in self.allowed_extensions

    def _upload_to_blob_storage(self, file, filename):
        """Upload file to Azure Blob Storage using SAS token"""
        try:
            # Construct the blob URL with SAS token
            blob_url = f"{self.azure_container_url}/{filename}?{self.azure_container_sas}"
            logger.info(f"Uploading to URL: {blob_url}")

            # Read file content
            file_content = file.read()
            file.seek(0)  # Reset file pointer
            logger.info(f"File size: {len(file_content)} bytes")

            # Upload the file
            headers = {
                'x-ms-blob-type': 'BlockBlob',
                'Content-Type': 'application/octet-stream'
            }

            response = requests.put(blob_url, data=file_content, headers=headers)
            logger.info(f"Upload response status: {response.status_code}")

            if response.status_code in [201, 200]:
                logger.info(f"Successfully uploaded {filename} to Azure Blob Storage")
                return True, f"File {filename} uploaded successfully"
            else:
                logger.error(f"Failed to upload {filename}: {response.status_code} - {response.text}")
                return False, f"Upload failed: {response.status_code} - {response.text[:200]}"

        except Exception as e:
            logger.error(f"Error uploading to blob storage: {str(e)}")
            return False, f"Upload error: {str(e)}"

    def upload_file(self):
        """Handle file upload request"""
        try:
            # Check if file is in request
            if 'file' not in request.files:
                return jsonify({
                    'success': False,
                    'message': 'No file provided'
                }), 400

            file = request.files['file']

            # Check if file is selected
            if file.filename == '':
                return jsonify({
                    'success': False,
                    'message': 'No file selected'
                }), 400

            # Validate file extension
            if not self._is_allowed_file(file.filename):
                return jsonify({
                    'success': False,
                    'message': 'File type not allowed. Supported formats: CSV, Excel (.xlsx, .xls), JSON, TXT'
                }), 400

            # Secure the filename
            filename = secure_filename(file.filename)

            # Check if this is BaseLine.xlsx - if so, use exact name to replace
            if filename.lower() == 'baseline.xlsx':
                unique_filename = 'BaseLine.xlsx'
                logger.info(f"Replacing existing BaseLine.xlsx file")
            else:
                # Add timestamp to avoid conflicts for other files
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                name, ext = os.path.splitext(filename)
                unique_filename = f"{name}_{timestamp}{ext}"

            # Upload to Azure Blob Storage
            success, message = self._upload_to_blob_storage(file, unique_filename)

            if success:
                return jsonify({
                    'success': True,
                    'message': message,
                    'filename': unique_filename
                }), 200
            else:
                return jsonify({
                    'success': False,
                    'message': message
                }), 500

        except Exception as e:
            logger.error(f"Upload file error: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Upload failed: {str(e)}'
            }), 500


# Create API instance
upload_api = UploadDataAPI()
    
