# Splitflow Client

CSV imports are available from **Expenses → Import CSV**. Upload results and batch errors appear inline, and the expense ledger refreshes after each completed import. Existing date filters remain active. The former `/imports` route redirects to the Expenses page with the importer open.

## ROI workflow

Record or edit placements with a revenue amount, currency, recognition date, and country. Open **Reports & reconciliation → Monthly country ROI** and select a month or view all months. Revenue uses recognition month; costs use expense transaction month. Both are valued in USD using historical rates. All recorded country/month costs are allocated to revenue for that same country/month. Placement counts and cost per placement use recognition month.

Existing placements need revenue entered through Edit. Missing revenue, missing rates, or unassigned countries are shown as incomplete, with profit and ROI withheld. Zero-cost ROI is undefined. The monthly ROI filter affects only the ROI report; the existing reconciliation and cost reports cover all dates.

Splitflow is a regional cost allocation and financial intelligence frontend.

## Current milestone

Milestones 1–3 establish the Vite + React JavaScript scaffold, routed responsive application shell, centralized API client, shared loading/error/empty states, Supabase Auth sign-in/session handling, and API-backed country and consultant management. Country history is displayed with its effective dates. Other finance and master-data pages remain pending UI integration; they do not display fabricated values.

## Local development

1. Install Node.js (current LTS) and npm.
2. Copy `.env.example` to `.env.local`.
3. Set `VITE_API_BASE_URL` to `https://splitflow-api-production.up.railway.app/api/v1` for the deployed API. For local backend development, use `http://localhost:3000/api/v1`.
4. Set the public Supabase project URL and publishable key (`VITE_SUPABASE_PUBLISHABLE_KEY`). These let Supabase JS persist and refresh the session returned by the API and process the Google OAuth callback. Never put a service-role key in Vite environment variables.
5. Configure the frontend origin in the API's `ALLOWED_ORIGINS` (the local default permits `http://localhost:5173`). Google OAuth also requires its provider and callback allow-list setup in Supabase.
6. Run `npm install`, then `npm run dev`.

## Backend contract reviewed

The companion API source is in `splitflow-capstone-api`. Its app mounts routes under `/api/v1`, returns structured `{ error: { code, message, requestId, details? } }` errors, and requires bearer tokens for resource routes. The frontend has implemented the auth contract and sends bearer tokens through the centralized API client. The backend has no profile/role endpoint, so frontend role-aware navigation is not available; API role checks remain authoritative and the UI must handle 403 responses.

Implemented API capabilities available for the next frontend milestones include countries list/create/update; consultants list/create/update and country history; expense list/get/create/update and conversion creation; CSV expense import and import-batch detail; pending conversion exceptions/retry; country, consolidated USD and reconciliation reports; and placements list/create. List endpoints use `limit` and `offset`. Expenses accept explicit original currency, and consultant country attribution is date-effective. Finalized conversion inputs are immutable. Reports currently have no date filters. The API does not currently expose a dashboard aggregate or conversion detail list beyond the pending exceptions and nested expense/conversion responses.

The API README documents backend setup and limitations. No backend files were modified. Production deployment, API connectivity, Supabase configuration, OAuth provider setup, and authenticated end-to-end flows remain unverified.
