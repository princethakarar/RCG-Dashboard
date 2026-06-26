<p align="center">
  <h1 align="center">
    <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/bar-chart-3.svg" width="32" height="32" alt="Icon" style="vertical-align: middle; margin-right: 8px;">
    RCG-Dashboard
  </h1>
</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js"></a>
  <a href="#"><img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React"></a>
  <a href="#"><img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="#"><img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS"></a>
  <a href="#"><img src="https://img.shields.io/badge/Recharts-3.8-FF7F50?style=for-the-badge&logo=react&logoColor=white" alt="Recharts"></a>
  <a href="#"><img src="https://img.shields.io/badge/SheetJS_XLSX-0.18-107C41?style=for-the-badge&logo=microsoftexcel&logoColor=white" alt="SheetJS"></a>
  <a href="#"><img src="https://img.shields.io/badge/Supabase-DB-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase"></a>
</p>

<p align="center">
  <img src="./screenshots/landing.png" alt="RCG Dashboard Hero" width="800" style="border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
</p>

<p align="center">
  <em>"A powerful, centralized financial data management and visualization hub for RCG."</em>
</p>

<hr>

## 📸 Visual Overview

<details>
  <summary><strong>📊 Net Asset Tracking</strong></summary>
  <br>
  <img src="./screenshots/net-asset.png" alt="Net Asset Tracking" width="800" style="border-radius: 8px;">
</details>

<details>
  <summary><strong>📈 Investment Strategies</strong></summary>
  <br>
  <img src="./screenshots/strategies.png" alt="Strategies View" width="800" style="border-radius: 8px;">
</details>

<details>
  <summary><strong>📤 Data Upload & Excel Parsing</strong></summary>
  <br>
  <img src="./screenshots/upload.png" alt="Upload Interface" width="800" style="border-radius: 8px;">
</details>

<details>
  <summary><strong>💼 Intern Portfolio Tracking</strong></summary>
  <br>
  <img src="./screenshots/intern-portfolio.png" alt="Intern Portfolio" width="800" style="border-radius: 8px;">
</details>

<details>
  <summary><strong>⚙️ Admin Controls</strong></summary>
  <br>
  <img src="./screenshots/admin.png" alt="Admin Controls" width="800" style="border-radius: 8px;">
</details>

---

## 🏗️ System Architecture / Data Flow

```mermaid
sequenceDiagram
    actor Admin
    participant Frontend (Next.js)
    participant API (App Router)
    participant Parser (SheetJS)
    participant Database (PostgreSQL)

    Admin->>Frontend (Next.js): Upload Financial Excel File
    Frontend (Next.js)->>API (App Router): POST /api/upload
    API (App Router)->>Parser (SheetJS): Parse Sheets & Extract Rows
    Parser (SheetJS)-->>API (App Router): Return JSON Data
    API (App Router)->>Database (PostgreSQL): Batch Insert Records
    Database (PostgreSQL)-->>API (App Router): Acknowledge Success
    API (App Router)-->>Frontend (Next.js): Return Processed Stats
    Frontend (Next.js)->>Admin: Render Success & Updated Charts
```

---

## ⚡ Features

### 📊 Charts & Data Visualizations
Interactive, robust financial charts powered by **Recharts**. The dashboard dynamically updates net asset values, strategy performance, and historical data, giving RCG immediate visibility into critical metrics.

### 📑 Export Reports
Generate and export comprehensive financial reports with a single click. The system supports downloading clean, formatted data as **PDFs** and **Excel (.xlsx)** files for external audits and internal team sharing.

### 🛠️ Excel Parser Pipeline
A powerful data ingestion engine utilizing **SheetJS**. Users can drag-and-drop complex internal Excel spreadsheets, which the system automatically parses, cleans, and ingests directly into the database.

### 🔒 Secure Auth & Admin Roles
Enterprise-grade authentication with secure login flows. Includes a dedicated `/admin` area allowing authorized personnel to manage user access, configure system settings, and safely oversee automated data ingestion.

### 💼 Portfolio Tracking
A dedicated module for tracking specialized portfolios (e.g., Intern Portfolios), providing granular views into individual asset allocation, performance trends, and aggregate return metrics over time.

---

## 🧠 Step-by-Step System Flow & Architecture

1. **Client Layer (Next.js 14 App Router)**
   The UI utilizes React Server Components and optimized routing to deliver a highly responsive experience. Global state and UI components are styled beautifully with **Tailwind CSS**.

2. **Data Ingestion Pipeline**
   When an Excel file is uploaded, the Next.js frontend sends it to server-side API routes (`/api/upload`). Here, it is intercepted, validated, and processed using `xlsx` to convert raw rows into structured JSON logic.

3. **Storage & Caching**
   - **PostgreSQL (via pg / Supabase)**: Core financial records, time-series metrics, and user metadata are stored securely in a relational database schema.
   - **Redis (Upstash)**: Used for high-speed caching of frequent dashboard queries and session rate-limiting.
   - **Blob Storage (Vercel)**: Manages unstructured file uploads and report generation artifacts.

4. **Visualization Engine**
   Data is fetched directly via Server Components and passed down to client components where **Recharts** takes over, rendering performant SVGs and responsive charts tailored specifically to the RCG ecosystem.

---

## 📂 Folder Structure

```bash
RCG-Dashboard/
├── app/
│   ├── admin/                # Admin portal & user management
│   ├── api/                  # Next.js API Routes (Upload, Data, Auth)
│   ├── components/           # Reusable UI components (Charts, Tables)
│   ├── intern-portfolio/     # Intern portfolio tracking views
│   ├── lib/                  # Core utilities (Redis, DB clients, Parsers)
│   ├── login/                # Authentication flow & logic
│   ├── net-asset/            # Net asset tracking visualizations
│   ├── strategies/           # Investment strategies performance page
│   ├── upload/               # Excel drag-and-drop ingestion interface
│   ├── layout.tsx            # Root layout & providers
│   └── page.tsx              # Dashboard Landing Page
├── public/                   # Static assets, icons, and generic images
├── scratch/                  # Scripts for DB migration and rapid testing
├── .env.local                # Local environment variables (gitignored)
├── next.config.mjs           # Next.js configuration
├── tailwind.config.ts        # Tailwind CSS theme and design tokens
└── package.json              # Dependencies (Recharts, SheetJS, pg, etc.)
```

---

## ⚡ Quick Start

Follow these steps to run the RCG-Dashboard locally on your machine.

### Prerequisites
- Node.js 18.x or later
- PostgreSQL database access
- Redis instance (Upstash recommended)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-org/RCG-Dashboard.git
cd RCG-Dashboard

# 2. Install dependencies
npm install
```

> [!NOTE]
> Make sure to install dependencies via `npm install` before attempting to run any scratch scripts or backend migrations.

### Environment Setup

```bash
# 3. Create your local environment file
cp .env.example .env.local
```

> [!IMPORTANT]
> You must populate the `.env.local` file with valid Supabase, PostgreSQL, and Upstash credentials, otherwise the API routes will fail on boot.

### Running the App

```bash
# 4. Start the development server
npm run dev
```
The dashboard will be available at `http://localhost:3000`.

---

## 🔑 Environment Variables

To properly configure the dashboard, ensure the following variables are set in your `.env.local` file:

| Variable | Description | Example / Source |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@db...` |
| `SUPABASE_URL` | Supabase project URL | `https://xyz.supabase.co` |
| `SUPABASE_ANON_KEY` | Public anonymous key for Supabase | `eyJh...` |
| `UPSTASH_REDIS_REST_URL` | Redis REST endpoint | `https://...upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Auth token for Redis access | `AYZ...` |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob access token | `vercel_blob_rw_...` |
| `JWT_SECRET` | Secret key for custom auth (bcryptjs/jose) | `your-super-secret-key` |
