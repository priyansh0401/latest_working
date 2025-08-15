import sys
import os
from pathlib import Path
import json
from http.server import BaseHTTPRequestHandler

# Add the backend directory to the Python path
backend_dir = Path(__file__).resolve().parent.parent / 'backend'
sys.path.insert(0, str(backend_dir))

# Set the Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guardian_eye.settings')

# Import Django and initialize it
import django
django.setup()

# Import MongoDB connection
from guardian_eye.mongodb import client

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            # Test MongoDB connection
            client.admin.command('ping')
            mongodb_status = "connected"
        except Exception as e:
            mongodb_status = f"error: {str(e)}"
        
        # Prepare response
        response = {
            "status": "ok",
            "timestamp": django.utils.timezone.now().isoformat(),
            "mongodb": mongodb_status
        }
        
        # Send response
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(response).encode())
        return
