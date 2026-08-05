<div align="center">

# 🌐 GeoNexus AI

### Intelligent Industrial Site Selection Platform

*Turning fragmented geospatial data into instant, explainable, AI-powered site suitability intelligence.*

[![Django](https://img.shields.io/badge/Django-5.x-092E20?style=flat&logo=django&logoColor=white)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-PostGIS-4169E1?style=flat&logo=postgresql&logoColor=white)](https://postgis.net/)
[![LightGBM](https://img.shields.io/badge/LightGBM-ML-00A0DC?style=flat)](https://lightgbm.readthedocs.io/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](#license)
[![Status](https://img.shields.io/badge/Status-Active%20Development-yellow.svg)](#roadmap)

[Overview](#overview) • [Features](#features) • [Architecture](#architecture) • [Tech Stack](#tech-stack) • [Getting Started](#getting-started) • [API](#api-reference) • [Roadmap](#roadmap)

</div>

---

## Overview

Selecting a location for a new industrial facility — a factory, warehouse, or logistics hub — traditionally requires days or weeks of manual work: pulling data from scattered government portals, overlaying shapefiles in desktop GIS tools, and cross-referencing spreadsheets by hand. The result is slow, inconsistent, and hard to justify to stakeholders.

**GeoNexus AI** replaces that process with a single platform. Drop a pin (or search an address), pick an industry type, and get an instant, explainable suitability score — backed by real proximity analysis across roads, railways, utilities, protected areas, demographics, and more, refined by a trained machine learning model.

> 📍 Current focus region: **Gujarat, India** — architecture is designed to extend to any region with equivalent open geospatial data.

---

## Features

### ✅ Currently Implemented

- **Multi-Criteria Suitability Scoring Engine** — a transparent, weighted MCDA (Multi-Criteria Decision Analysis) model scoring any location against 11 geospatial and demographic criteria (roads, railways, transport, water bodies, hospitals, population, building density, land use, protected areas, and natural-area risk).
- **Highway Connectivity Intelligence** — doesn't just measure distance to the nearest road; identifies the nearest *named* highway and the real settlements it connects to nearby, weighted by population — so a highway leading toward a major industrial hub scores higher than an equally-close road to nowhere.
- **Industry-Specific Weight Profiles** — Warehousing/Logistics, General Manufacturing, Chemical/Hazardous, IT/Electronics, and Food Processing each apply a different, purpose-built weighting to the same underlying data.
- **LightGBM ML Surrogate Model** — trained on bootstrapped labels generated from the rule-based engine itself, blended with the transparent MCDA score to combine explainability with learned feature interactions.
- **PostGIS-Powered Spatial Queries** — nearest-neighbor and intersection queries (`ST_Distance`, `ST_DWithin`, `ST_Intersects`, KNN `<->` operator) run directly in the database for speed and correctness at scale.
- **Interactive Map Interface** — click-to-select site analysis on a MapLibre GL map, built on React + Vite + Tailwind CSS.
- **REST API** — Django REST Framework backend exposing scoring, project, and (in progress) reporting endpoints.
- **Risk Blocker Detection** — sites intersecting protected/conservation areas are explicitly flagged as regulatory blockers, not just penalized numerically.

### 🚧 In Active Development

- User authentication & project/site bookmarking (`users`, `api` apps scaffolded)
- Automated PDF feasibility reports (`reports` app scaffolded)
- Recommendation engine for proactive top-N site discovery (`recommendations` app scaffolded)
- Conversational AI assistant for natural-language site Q&A (`geochat` app scaffolded)

See the full [Roadmap](#roadmap) below for the complete build sequence.

---

## Architecture

```
┌──────────────────────┐        ┌──────────────────────────────────────┐
│   React Frontend      │        │            Django Backend             │
│   (Vite + Tailwind)   │  REST  │                                        │
│                        │◄──────►│  apps/analysis    → scoring orchestr. │
│  • MapLibre GL map     │  API   │  apps/analysis/ml → LightGBM + MCDA   │
│  • Analysis panel      │        │  apps/recommend.  → weights + MCDA    │
│  • Results dashboard   │        │  apps/reports      → PDF generation   │
│  • Auth context        │        │  apps/users         → accounts        │
└──────────────────────┘        │  apps/geochat       → AI assistant     │
                                  │  apps/api           → spatial models   │
                                  └──────────────┬─────────────────────────┘
                                                 │
                                  ┌──────────────▼─────────────────────────┐
                                  │      PostgreSQL + PostGIS (NeonDB)      │
                                  │  roads · railways · waterbodies ·       │
                                  │  protected_areas · hospitals · places · │
                                  │  landuse · natural · buildings ·        │
                                  │  districts · transport                  │
                                  └──────────────────────────────────────────┘
```

**Scoring pipeline (per request):**
1. React sends `{ lat, lon, industry }` to `POST /api/analysis/score/`
2. Django extracts raw spatial features via PostGIS proximity/intersection queries
3. Raw values are normalized into 0–1 sub-scores per criterion (proximity decay, risk inversion, or min-max range functions, depending on criterion type)
4. A rule-based composite score is computed using the selected industry's weight profile
5. The same normalized features are passed to the trained LightGBM model for a learned score
6. Both scores are blended into a final, explainable result and persisted to `AnalysisRun`

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, MapLibre GL JS, Axios |
| **Backend** | Django 5, Django REST Framework |
| **Database** | PostgreSQL + PostGIS (hosted on NeonDB) |
| **Machine Learning** | LightGBM, scikit-learn, pandas, joblib |
| **Model Training** | Google Colab (GPU-accelerated notebooks) |
| **Spatial Data** | OpenStreetMap extracts (roads, railways, POIs), shapefiles |
| **Auth** | Django REST Framework + JWT *(in progress)* |
| **Deployment (planned)** | Docker, GitHub Actions CI/CD, Vercel (frontend) |

---

## Project Structure

```
├── backend/
│   ├── apps/
│   │   ├── analysis/          # Core scoring orchestration
│   │   │   ├── ml/            # Feature engineering, LightGBM predictor
│   │   │   └── services/      # Django-facing scorer (persists AnalysisRun)
│   │   ├── api/                # Spatial models (Road, Railway, Airport)
│   │   ├── recommendations/    # MCDA math + industry weight profiles
│   │   ├── reports/             # PDF report generation (in progress)
│   │   ├── geochat/              # Conversational AI assistant (in progress)
│   │   ├── users/                 # Authentication & accounts
│   │   └── ml_models/              # Trained model artifacts (.pkl)
│   ├── config/                      # Django settings, URLs, WSGI/ASGI
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── api/                # Axios client + endpoint wrappers
│   │   ├── components/
│   │   │   ├── Map/             # MapLibre GL map component
│   │   │   ├── Analysis/        # AnalysisPanel, ResultsPanel
│   │   │   ├── Projects/        # Saved site management
│   │   │   └── Reports/         # Report download UI
│   │   ├── contexts/            # AuthContext
│   │   ├── pages/                # Login, Register, Dashboard
│   │   └── utils/
│   └── vite.config.js
└── data/                        # Raw shapefiles / source datasets
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20 LTS
- A PostgreSQL database with the PostGIS extension enabled (this project uses [NeonDB](https://neon.tech))

### Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

pip install -r requirements.txt

# Configure environment variables — see below
cp .env.example .env

python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend Setup

```bash
cd frontend
npm install

# Configure environment variables — see below
cp .env.example .env

npm run dev
```

### Environment Variables

**`backend/.env`**
```env
SECRET_KEY=your-django-secret-key
DEBUG=True
DATABASE_URL=postgresql://<user>:<password>@<neon-host>/<dbname>?sslmode=require
```

**`frontend/.env`**
```env
VITE_API_BASE_URL=http://localhost:8000
```

### Verify the Setup

```bash
# From the backend shell (python manage.py shell)
from apps.analysis.ml.scoring import compute_suitability_score
result = compute_suitability_score(lat=22.3072, lon=73.1812, industry="warehousing_logistics")
print(result["overall_score"])
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/analysis/score/` | Score a location for a given industry type. Returns overall score, per-criterion breakdown, risk blockers, and highway connectivity narrative. |
| `GET` | `/api/projects/` | *(in progress)* List saved analysis projects. |
| `POST` | `/api/reports/{run_id}/generate/` | *(in progress)* Generate a downloadable PDF feasibility report. |

**Example request:**
```json
POST /api/analysis/score/
{
  "lat": 22.3072,
  "lon": 73.1812,
  "industry": "warehousing_logistics"
}
```

**Example response:**
```json
{
  "overall_score": 78.4,
  "rule_based_score": 76.2,
  "ml_predicted_score": 81.9,
  "feature_scores": {
    "road": 92.1,
    "highway_connectivity": 85.0,
    "railway": 64.3,
    "protected_area": 100.0
  },
  "risk_blockers": [],
  "highway_narrative": "Nearest highway: NH48, 2.1 km away.\n  -> connects to Vadodara (pop. 1,670,806, 14.2 km): significant industrial/commercial center..."
}
```

---

## Roadmap

This project is being built in deliberate, sequential stages — each one validated before the next begins.

- [x] **Foundational scoring engine** — MCDA model with 11 criteria and industry-specific weight profiles
- [x] **PostGIS spatial data pipeline** — road, rail, water, protected area, demographic, and land-use layers
- [x] **LightGBM ML surrogate** — trained on bootstrapped labels, blended with rule-based scoring
- [x] **Interactive map + analysis dashboard** — React + MapLibre GL frontend
- [ ] **User accounts & saved projects** — authentication, site bookmarking, comparison view
- [ ] **Automated PDF reports** — feasibility reports with maps, scorecards, and narrative justification
- [ ] **Multi-tenant SaaS foundation** — organizations, role-based access control, billing
- [ ] **Predictive analytics** — land price and infrastructure growth forecasting
- [ ] **Satellite imagery AI** — CNN-based land-use verification and change detection
- [ ] **Conversational AI assistant** — LLM-powered, data-grounded site Q&A and auto-narrative reports
- [ ] **AI Site Scout** — proactive top-N site recommendation across a region
- [ ] **Enterprise hardening** — SSO, compliance/audit logging, multi-region deployment

---


## License

Distributed under the MIT License. See `LICENSE` for details.

---

## Author

Built as an enterprise-grade, AI-native industrial site selection platform for the Gujarat, India market.

<div align="center">

*If this project is useful to you, consider giving it a ⭐*

</div>
