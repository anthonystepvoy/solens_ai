@echo off
call "C:\Users\HomePC\Documents\Code Togheter\solens_ai\env_vars.bat"
cd /d "C:\Users\HomePC\Documents\Code Togheter\solens_ai\backend\python_scripts"
call venv\Scripts\activate
python copy_trader_analyzer.py 