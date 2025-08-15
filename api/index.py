import sys
import os
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).resolve().parent.parent / 'backend'
sys.path.insert(0, str(backend_dir))

# Set the Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guardian_eye.settings')

# Import Django and initialize it
import django
django.setup()

# Import the WSGI application
from guardian_eye.wsgi import application

# Handler for Vercel serverless function
def handler(request, **kwargs):
    return application(request, **kwargs)
