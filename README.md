# AWS EC2 Decision Support Dashboard

A full-stack dashboard for exploring AWS EC2 cost and performance trade-offs using selected scenario variables such as average CPU, peak CPU, runtime, region, storage type, storage size, and optimisation objective.

## Tech stack

- Frontend: React + Vite + Tailwind CSS + Recharts
- Backend: FastAPI + SQLAlchemy + pandas
- Database: PostgreSQL for the main local setup
- Data input: Local CSV dataset import

## What you need to install

Before running the project, install:

- Node.js and npm
- Python 3
- PostgreSQL
- Git

Recommended:

- Node.js 20 LTS
- PostgreSQL 15 or newer

## Project structure

- `src/App.jsx`: main React dashboard
- `backend/app/main.py`: FastAPI entry point
- `backend/app/services/recommendations.py`: deterministic recommendation logic
- `backend/app/services/ingestion.py`: CSV import logic
- `backend/data/imports`: sample import data

## 1. Clone the repository

```powershell
git clone <your-repository-url>
cd aws-ec2-dashboard
```

## 2. Set up the backend

Move into the backend folder:

```powershell
cd backend
```

Create and activate a virtual environment:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Install Python dependencies:

```powershell
pip install -r requirements.txt
```

Create your environment file:

```powershell
Copy-Item .env.example .env
```

The default backend environment file expects a local PostgreSQL database:

```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/aws_ec2_dashboard
API_HOST=127.0.0.1
API_PORT=8000
MONTH_HOURS=730
```

Create the PostgreSQL database before starting the API:

```sql
CREATE DATABASE aws_ec2_dashboard;
```

Start the backend server:

```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

The API should then be available at:

- `http://127.0.0.1:8000`
- Health check: `http://127.0.0.1:8000/health`

### Optional quick local fallback

If you do not want to use PostgreSQL immediately, the backend code also supports a local SQLite fallback when no PostgreSQL `DATABASE_URL` is provided. For the main project setup, PostgreSQL is the intended local database.

## 3. Set up the frontend

Open a second terminal in the project root:

```powershell
cd aws-ec2-dashboard
npm install
```

Start the frontend:

```powershell
npm run dev -- --host 127.0.0.1 --port 5173
```

The dashboard should then be available at:

- `http://127.0.0.1:5173`

## 4. Import the sample CSV data

Sample files are included in:

- `backend/data/imports/batch_instance_20000.csv`
- `backend/data/imports/schema.csv`

If you want to import datasets through the backend API, use:

- `POST /import/workload-csv`
- `POST /import/pricing-csv`

## 5. Useful checks

Run backend tests:

```powershell
cd backend
python -m pytest -v
```

Build the frontend for production:

```powershell
npm run build
```

Run the frontend linter:

```powershell
npm run lint
```

## Running the full project

In practice you will usually run:

1. Backend on `127.0.0.1:8000`
2. Frontend on `127.0.0.1:5173`
3. PostgreSQL locally

Then open the frontend in your browser and use the dashboard normally.

## Notes

- This project uses deterministic weighted scoring, not machine learning.
- CSV ingestion uses local dataset files, not a live AWS feed.
- The project is a local/demo implementation of the dashboard workflow.
