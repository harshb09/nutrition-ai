# Nutrition Atlas — Country Malnutrition Profile Tool

A production-quality country malnutrition profiling and similarity clustering web application engineered for international health organizations, policy analysts, and epidemiological researchers.

Nutrition Atlas unifies fragmented global malnutrition datasets, models multi-dimensional health typologies via standardized clustering, benchmarks country indicators against empirical similarity groups and peers, and exports server-rendered A4 policy briefs.

---

## Architecture & Design Principles

- **Separation of Pipeline and API**: Data cleaning, imputation, and clustering run completely offline in a reproducible statistical pipeline. The deployed FastAPI backend is lightweight, loading only precomputed JSON/CSV artifacts into memory at startup without needing `scikit-learn` or raw input spreadsheets.
- **Empirical Rigor**: No invented data or hardcoded numbers. All indicators, percentiles, peer distances, and trend trajectories derive directly from pipeline outputs.
- **Dark-Only Professional Product UI**: Built to the visual standard of clinical research and health-tech dashboards (#0B0F14 background, #121821 surface, #2DD4BF teal accent, Inter typography, tabular numerals, color-blind safe group palettes).
- **Responsible Use & Caveats**: Clearly communicates that clusters represent exploratory statistical similarity groups rather than clinical or policy rankings.

---

## Repository Structure

```
.
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application & startup artifact loader
│   │   ├── config.py            # CORS & path configurations
│   │   ├── models/              # Pydantic schemas (common, country, group, methodology)
│   │   ├── routers/             # API routes (health, countries, groups, methodology, export)
│   │   └── services/            # In-memory store & ReportLab 1-page PDF brief generator
│   ├── pipeline/                # Offline processing & validation pipeline
│   │   ├── ingest.py            # Raw spreadsheet parsing & ISO3 unification
│   │   ├── preprocess.py        # 7-feature extraction, KNN-5 imputation, scaling
│   │   ├── clustering.py        # KMeans (Euclidean) & custom KMedians (Manhattan)
│   │   ├── metrics.py           # WCSS, Silhouette, Davies-Bouldin
│   │   ├── hierarchical.py      # Ward & Average linkage, cophenetic r, dendrogram
│   │   ├── pca.py               # 2D PCA coordinates, variance, loadings
│   │   ├── stability.py         # 30 seeds + 100 bootstrap 80% subsamples, co-association
│   │   ├── interpretation.py    # Group ordering, z-descriptors, peer distance, relative flags
│   │   ├── export_artifacts.py  # JSON & CSV artifact serialization
│   │   └── run.py               # Pipeline entry point (`python -m pipeline.run`)
│   ├── artifacts/               # Committed pipeline outputs (JSON & CSV)
│   ├── tests/                   # Pytest test suite (18 unit and endpoint tests)
│   ├── requirements.txt         # Lightweight runtime dependencies (FastAPI, reportlab, pandas)
│   └── requirements-pipeline.txt# Offline pipeline dependencies (scikit-learn, scipy, openpyxl)
├── frontend/
│   ├── src/
│   │   ├── api/                 # Typed API client with 60s cold-start retry handler
│   │   ├── components/          # BentoCard, Sidebar, Header, CommandPalette, StatusNotice
│   │   ├── pages/               # Overview, CountryProfile, SimilarCountries, Groups, Methodology, DataSources
│   │   ├── tests/               # Vitest unit tests for formatters and error handlers
│   │   ├── App.tsx              # Router & global Cmd+K keyboard shortcut
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── data/
│   └── raw/                     # Original spreadsheets from UNICEF, WHO, GNR, World Bank
├── render.yaml                  # Multi-service Render deployment blueprint
└── README.md
```

---

## Step-by-Step Render Deployment Guide

The repository includes a `render.yaml` blueprint defining two interconnected services on Render's free tier:

1. **`nutrition-atlas-api`** (Python Web Service)
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Health Check Path: `/api/health`
   - Environment: Python 3.11

2. **`nutrition-atlas-web`** (Static Site)
   - Root Directory: `frontend`
   - Build Command: `npm ci && npm run build`
   - Publish Directory: `dist`
   - Rewrite Rule: `/*` -> `/index.html` (Single Page Application routing)

### Deployment Steps:

1. **Push to GitHub**: Ensure the repository is committed and pushed to your GitHub or GitLab account.
2. **Create Blueprint on Render**:
   - Log in to your [Render Dashboard](https://dashboard.render.com/).
   - Click **New +** and select **Blueprint**.
   - Connect your repository and select the branch (`main`).
   - Render will parse `render.yaml` and provision both the web service and the static site.
3. **Synchronize Cross-Service Environment Variables**:
   - Once the services are provisioned, copy the backend URL (e.g. `https://nutrition-atlas-api.onrender.com`).
   - In the **`nutrition-atlas-web`** static site settings:
     - Verify or update `VITE_API_URL` to your backend URL: `https://nutrition-atlas-api.onrender.com`.
     - Click **Save Changes** and trigger a manual redeploy.
   - In the **`nutrition-atlas-api`** web service settings:
     - Update `CORS_ORIGINS` to allow your frontend URL: `https://nutrition-atlas-web.onrender.com`.
     - Click **Save Changes** (Render will automatically redeploy the web service).
4. **Cold Start Resilience**:
   - On the Render free tier, web services spin down after 15 minutes of inactivity. The Nutrition Atlas frontend includes a built-in cold-start countdown banner that retries requests for up to 60 seconds with live elapsed progress.

---

## Local Development & Re-running the Pipeline

### 1. Re-running the Offline Pipeline

To re-process raw data, re-evaluate all clustering combinations ($K=2..8$ for K-Means and K-Medians), run the 100 bootstrap stability subsamples, and refresh `backend/artifacts/`:

```bash
cd backend
python3 -m pipeline.run
```

All 9 artifacts will be updated in `backend/artifacts/`:
- `metadata.json`: Dataset counts, feature definitions, and 75th percentile thresholds
- `countries.json`: Complete 202-country profiles with raw/imputed values and relative flags
- `groups.json`: Profiles for Groups A, B, and C with centroid z-score descriptors
- `peers.json`: 5 nearest neighbours by Euclidean distance in standardized 7D space
- `trends.json`: 2000–2024 time-series for stunting and child overweight
- `methodology.json`: PCA coordinates, dendrogram linkage, stability audit, and sensitivity tests
- `selection.json`: Coded selection rule decisions and empirical rationale
- `preprocessing_log.json`: Missingness audit, KNN-5 imputation log, and collinearity justifications
- `dataset.csv`: Consolidated, cleaned tabular dataset for researchers

### 2. Running Backend Tests and Server

```bash
cd backend

# Run the 18 pytest unit and integration tests
pytest

# Start the FastAPI server locally on http://127.0.0.1:8000
uvicorn app.main:app --reload --port 8000
```

Available API endpoints:
- `GET /api/health`: Health status and artifact load confirmation
- `GET /api/meta`: Dataset summary and thresholds
- `GET /api/countries`: List all 202 countries (with `group_id`, `status`, and `search` filters)
- `GET /api/countries/{iso3}`: Detailed profile with group benchmark and data years
- `GET /api/countries/{iso3}/peers`: 5 nearest peers with indicator differences
- `GET /api/countries/{iso3}/trends`: 2000–2024 time series
- `GET /api/groups`: Group profiles with provisional descriptors and member lists
- `GET /api/groups/{id}`: Single group details
- `GET /api/methodology`: Diagnostic logs, PCA, dendrogram, and stability audit
- `GET /api/dataset.csv`: Cleaned CSV download
- `GET /api/countries/{iso3}/brief.pdf`: Dynamic 1-page A4 PDF brief (server-rendered with ReportLab)

### 3. Running Frontend Tests and Dev Server

```bash
cd frontend

# Install dependencies
npm install

# Run TypeScript type check
npx tsc --noEmit

# Run Vitest unit tests (formatters and error handling)
npm test

# Build for production
npm run build

# Start local dev server on http://localhost:5173
npm run dev
```

---

## Primary Data Sources & Academic Citations

1. **UNICEF / WHO / World Bank Joint Child Malnutrition Estimates (JME)**
   - *Release*: March 2026 Edition
   - *Indicators*: Child Stunting (% under 5), Child Overweight (% under 5)
   - *Citation*: United Nations Children’s Fund (UNICEF), World Health Organization, International Bank for Reconstruction and Development/The World Bank. *Levels and trends in child malnutrition: Key findings of the 2026 Edition of the Joint Child Malnutrition Estimates*. New York: UNICEF; 2026.

2. **Global Nutrition Report (GNR) Country Nutrition Profiles**
   - *Release*: February 2023 Release
   - *Indicators*: Child Wasting (% under 5), Adult Obesity (BMI ≥ 30 kg/m²), Adult Diabetes (fasting glucose ≥ 7.0 mmol/L), Anaemia in Women of Reproductive Age (15–49 years), Exclusive Breastfeeding (< 6 months)
   - *Citation*: Development Initiatives. *Global Nutrition Report 2023: Country Nutrition Profiles dataset*. Bristol, UK: Development Initiatives; 2023.

3. **UNICEF-WHO Low Birthweight Estimates**
   - *Release*: 2023 Edition
   - *Indicators*: Low Birth Weight prevalence (< 2,500 grams at birth, % of live births)
   - *Citation*: United Nations Children’s Fund and World Health Organization. *Low birthweight estimates: Levels and trends 2000–2020*. Geneva: World Health Organization; 2023.

4. **World Bank World Development Indicators (WDI)**
   - *Release*: Series `SH.ANM.CHLD.ZS`
   - *Indicators*: Prevalence of anaemia among children (% of children aged 6–59 months)
   - *Citation*: World Bank. *World Development Indicators: Prevalence of anemia among children (% of children ages 6-59 months), series SH.ANM.CHLD.ZS*. Washington, DC: The World Bank Group; 2024.
