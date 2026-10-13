#!/bin/bash
echo "=============================================================================="
echo "   PFE Hunter - Career Command Center"
echo "   FastAPI (Port 8003) + PostgreSQL (Port 5432) + Vite Frontend (Port 5174)"
echo "=============================================================================="

# Launch FastAPI in background
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8003 --reload &
BACKEND_PID=$!

# Launch Vite
npm run dev &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID | Frontend PID: $FRONTEND_PID"
echo "Local access:   http://localhost:5174"
echo "Swagger Docs:   http://localhost:8003/docs"

wait
