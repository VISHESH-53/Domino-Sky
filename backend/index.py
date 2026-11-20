"""
DOMINO SKY — FastAPI Backend Entrypoint for Vercel Services
Explicitly assigns 'app = ...' and 'handler = ...' at module top level.
"""
import os
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import app.main

app = app.main.app
handler = app
