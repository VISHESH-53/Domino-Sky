import sys
from pathlib import Path

# Ensure backend folder is on the Python path for Vercel serverless functions
root_dir = Path(__file__).resolve().parent.parent
backend_dir = root_dir / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.main import app

# Vercel serverless expects the ASGI app
# app is now ready to receive requests
