# CreatorIQ

### Unified Social Media Intelligence Platform for Creators & Agencies

CreatorIQ is a full-stack analytics platform designed to centralize creator performance data from multiple social platforms into a single, scalable analytics workspace.

Instead of forcing creators and agencies to switch between separate platform dashboards, CreatorIQ provides a unified experience for **content performance, audience analytics, growth intelligence, revenue tracking, and reporting**.

The system is designed around a **platform-independent analytics architecture**, allowing new social platforms to be integrated without rebuilding the analytics layer.

--- 
 
## 🚀 Why CreatorIQ?

Creators manage data across multiple platforms, but each platform exposes different APIs, authentication mechanisms, metrics, and data structures.

This creates three major problems:

* Analytics are fragmented across platforms.
* Platform APIs expose different levels of information.
* Building separate dashboards for every platform creates duplicated code and becomes difficult to maintain.

### CreatorIQ's approach

```text
Multiple Platforms
       ↓
Platform Adapters
       ↓
Normalized Analytics Layer
       ↓
Active Platform
       ↓
Shared Analytics Modules
       ↓
Creator Insights
```

The result is a **single analytics system that can evolve independently of individual social platforms**.

---

# ✨ Core Capabilities

### 🔐 Identity & Access

* Secure registration and login
* JWT-based authentication
* Google OAuth 2.0
* User-specific authorization
* Protected application routes

### 🔗 Social Platform Integration

Designed for:

* YouTube
* Instagram
* Facebook
* LinkedIn
* X (Twitter)

Each platform follows a common **Connect → Active → Disconnect** lifecycle.

### 📊 Content Intelligence

* Content performance dashboard
* Views, likes, comments and engagement
* Top-performing content
* Content comparison
* Performance trends
* Search, filtering and sorting

### 👥 Audience Intelligence

* Followers/subscribers
* Growth analysis
* Audience demographics
* Geographic distribution
* Audience activity
* Reach and impressions
* Engagement insights

### 📈 Growth & Trend Intelligence

* Historical performance
* Growth monitoring
* Trend detection
* Content-category analysis
* Hashtag analysis
* Reach prediction
* Audience growth forecasting
* Growth recommendations

### 💰 Revenue Intelligence

* Revenue overview
* Revenue-source analysis
* Monthly, quarterly and annual trends
* Sponsorship tracking
* Affiliate revenue
* Brand collaborations
* Subscription revenue
* Financial insights

### 📑 Reporting

A centralized reporting layer converts analytics into understandable performance summaries for creators and agencies.

---

# 🧠 Architecture

CreatorIQ separates **platform-specific integration logic** from the **shared analytics experience**.

```text
                    ┌───────────────┐
                    │     User      │
                    └───────┬───────┘
                            │
                            ▼
                  ┌───────────────────┐
                  │   React Frontend  │
                  └─────────┬─────────┘
                            │
                            ▼
                  ┌───────────────────┐
                  │   FastAPI Layer   │
                  └─────────┬─────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
        Authentication   Platform      Analytics
        & Authorization  Services       Engine
              │             │             │
              │       ┌─────┼─────┐       │
              │       │     │     │       │
              │       ▼     ▼     ▼       │
              │     YouTube Meta  ...     │
              │                         │
              └─────────────┬───────────┘
                            ▼
                     ┌─────────────┐
                     │ PostgreSQL  │
                     └──────┬──────┘
                            ▼
                  ┌───────────────────┐
                  │ Active Platform   │
                  │ Analytics Context │
                  └─────────┬─────────┘
                            ▼
              ┌──────────────────────────┐
              │ Shared Analytics Modules│
              ├──────────────────────────┤
              │ Content                  │
              │ Audience                 │
              │ Growth                   │
              │ Revenue                  │
              │ Reports                  │
              └──────────────────────────┘
```

---

# 🎯 Active Platform Architecture

One of the core architectural decisions is the **Active Platform Context**.

The analytics pages do not directly depend on YouTube, Instagram, Facebook, or another individual platform.

Instead:

```text
Connect YouTube
      ↓
YouTube = Active Platform
      ↓
Shared Analytics Pages
      ↓
YouTube Data
```

When the user changes platforms:

```text
Disconnect YouTube
      ↓
Connect Instagram
      ↓
Instagram = Active Platform
      ↓
Same Analytics Pages
      ↓
Instagram Data
```

### Why this matters

Without this architecture, every platform would require separate versions of:

* Content Analytics
* Audience Analytics
* Growth Analytics
* Revenue Analytics
* Reports

That creates duplicated logic.

CreatorIQ instead uses a **shared analytics layer**, making future integrations significantly easier to maintain.

---

# 🔄 Platform Adapter Concept

Each platform has its own API and terminology.

For example:

```text
YouTube
Subscribers / Videos / Views

Instagram
Followers / Reels / Reach

LinkedIn
Followers / Posts / Impressions
```

CreatorIQ separates these differences inside platform-specific services and maps available metrics into a common analytics structure.

This creates a scalable model:

```text
Platform API
     ↓
Platform Adapter
     ↓
Normalized Data
     ↓
Analytics Engine
     ↓
Reusable UI
```

Adding a new platform should therefore require primarily a **new adapter and metric mapping**, rather than rebuilding the entire frontend.

---

# 🔐 Security Architecture

Security is handled as a first-class part of the application.

### Authentication

```text
User
 ↓
Login / OAuth
 ↓
JWT
 ↓
Authenticated API Request
 ↓
Backend Authorization
```

### User-scoped data

The backend identifies the authenticated user before retrieving analytics.

```text
Authenticated User
       ↓
User ID
       ↓
Database Query
       ↓
Only authorized user's data
```

The AI/analytics layer never needs unrestricted access to the complete database.

### Credential protection

Sensitive credentials are kept server-side:

```text
.env
 ↓
Backend
 ↓
External API
```

They are never exposed through the React client.

Protected values include:

* API keys
* OAuth client secrets
* JWT secrets
* Access tokens
* Database credentials

`.env` is excluded from version control.

---

# 🤖 AI Analytics Architecture

CreatorIQ can extend beyond visualization into **AI-powered analytics intelligence**.

Instead of building an LLM from scratch, an existing LLM can be connected to the analytics engine.

```text
Authenticated User
        ↓
User-specific Analytics
        ↓
Metric Calculation
        ↓
Controlled AI Context
        ↓
LLM
        ↓
Personalized Insight
```

Example:

> **"Why did my engagement increase this month?"**

The backend can provide only the relevant user's analytics:

```text
Current Engagement: 8.4%
Previous Engagement: 6.1%
Top Category: Technology
Best Posting Period: 7 PM – 9 PM
```

The LLM converts those structured values into a natural-language explanation.

### Potential AI capabilities

* Performance explanations
* Growth insights
* Content recommendations
* Posting-time recommendations
* Content idea generation
* Trend explanations
* Anomaly explanations

The AI layer is therefore an **analytics intelligence layer**, not merely a generic chatbot.

---

# 📡 API Strategy

CreatorIQ distinguishes between:

### Public API Data

Information that a platform officially exposes through public APIs.

### Authenticated Data

Information available only after OAuth authorization and required permissions.

### Derived Analytics

Metrics calculated by CreatorIQ from available historical data.

Examples:

```text
Growth %
Engagement Rate
Trend Direction
Performance Comparison
Forecasts
```

### Unavailable Metrics

If a platform does not expose a particular metric through the available API/permissions, the application should not invent a value.

It can instead:

* Mark the metric as unavailable
* Use supported derived metrics
* Use clearly labelled demonstration data where appropriate

This keeps the analytics architecture adaptable to real-world API limitations.

---

# 🛠️ Technology Stack

## Frontend

* React
* Vite
* Tailwind CSS
* Axios

## Backend

* Python
* FastAPI
* Pydantic
* SQLAlchemy
* REST APIs

## Database

* PostgreSQL

## Authentication

* JWT
* OAuth 2.0
* Google Authentication

## Platform APIs

* YouTube Data API v3
* Meta/Instagram APIs
* Extensible platform adapter architecture

## AI

* LLM-based analytics intelligence layer

## Development

* Git
* GitHub
* Environment-based configuration

---

# 🧩 Engineering Challenges & Solutions

| Challenge                             | Solution                                          |
| ------------------------------------- | ------------------------------------------------- |
| Different APIs for every platform     | Platform adapter architecture                     |
| Different metric names and structures | Normalized analytics layer                        |
| Duplicated analytics pages            | Shared Active Platform architecture               |
| User data isolation                   | JWT + backend authorization + user-scoped queries |
| Secret exposure                       | Backend-only environment variables                |
| API limitations                       | Capability-aware metric handling                  |
| Historical analysis                   | Stored analytics + calculation layer              |
| AI personalization                    | Controlled user-specific AI context               |
| Future platform expansion             | Modular integration architecture                  |

---

# 📊 Analytics Model

CreatorIQ separates **raw platform data** from **derived intelligence**.

```text
Raw Platform Data
      ↓
Data Normalization
      ↓
Metric Calculation
      ↓
Historical Storage
      ↓
Trend Analysis
      ↓
AI Insights
```

This makes the system easier to scale and allows analytics logic to evolve independently from platform APIs.

---

# 📈 Scalability

The architecture is designed so that adding a platform does not require duplicating the entire application.

### Current conceptual model

```text
                    Shared Analytics
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
     YouTube            Instagram          Facebook
        │                  │                  │
     Adapter             Adapter            Adapter
        │                  │                  │
     API Data            API Data           API Data
```

Future platforms can follow the same pattern:

```text
LinkedIn
X
TikTok
Other Platforms
```

The frontend analytics experience remains reusable.

---

# ⚙️ Local Development

```bash
git clone <repository-url>

cd backend
pip install -r requirements.txt

# Configure environment variables
# Create .env from .env.example

uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

---

# 🔒 Environment Configuration

Never commit secrets to GitHub.

Example:

```env
DATABASE_URL=
JWT_SECRET_KEY=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

YOUTUBE_API_KEY=

INSTAGRAM_CLIENT_ID=
INSTAGRAM_CLIENT_SECRET=

GEMINI_API_KEY=
```

Use `.env.example` to document required configuration without exposing real credentials.

---

# 🎓 Internship Project

**Infosys Springboard Virtual Internship**

CreatorIQ was developed as a practical full-stack project focused on:

* Scalable software architecture
* Secure authentication
* OAuth 2.0
* REST API integration
* Database-driven analytics
* Multi-platform architecture
* Data normalization
* Historical trend analysis
* AI-assisted analytics
* Production-oriented engineering practices

---

# 💼 Interview Highlights

### Problem Solved

Centralized fragmented social-media analytics into one extensible platform.

### Most Important Architecture

**Active Platform + Platform Adapter + Shared Analytics Layer**

### Security

**JWT + OAuth 2.0 + backend authorization + server-side secrets + user-scoped data**

### Scalability

New platforms can be added through adapters without duplicating analytics pages.

### AI

LLM-based analytics can transform authenticated user-specific metrics into personalized insights.

### Key Engineering Lesson

Third-party APIs are not uniform. A scalable application must isolate platform-specific logic from the business and presentation layers.

---

## 👨‍💻 Developer

**Pallapu Mahesh**
B.Tech — Computer Science & Engineering

**Core Technologies:**
`Python` · `FastAPI` · `React` · `PostgreSQL` · `SQLAlchemy` · `JWT` · `OAuth 2.0` · `REST APIs` · `API Integration` · `Analytics` · `LLM/AI`
