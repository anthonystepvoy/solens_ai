#!/bin/bash
cd "$(dirname "$0")"
source venv/Scripts/activate
uvicorn backend_api.main:app --reload --host 0.0.0.0 --port 8000 