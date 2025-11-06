# SPCN Suite Drafting App

A client-only React + TypeScript application for running SPCN suite drafts end-to-end in accordance with the PRD. Suite Directors can import dancer submissions from CSV, run a turn-based draft with automated recommendations, manually assign dancers, finalize rosters, persist progress to local storage, and export final CSVs.

## Getting Started

```bash
npm install
npm run dev
```

The app runs on `http://localhost:5173` by default.

## Running Tests

```bash
npm run test -- --run
```

Vitest + Testing Library cover CSV parsing, recommendation scoring, export builders, and core draft-store flows.

## Key Features

- CSV import with required-column validation and preview table (FR-1/2)
- Turn-based drafting across fixed suites with recommendation engine (FR-3–5)
- Manual dancer assignment and suite finalization controls (FR-4/6)
- Auto-save to `localStorage` with resume/clear prompts (FR-7, Section 10)
- CSV export for all suites and combined assignments (FR-8, Section 11)
- Desktop-first UI optimized for quick turn actions with roster dashboards (Section 9)

## CSV Format

The importer expects the following headers (case-sensitive):

- `Full Name`
- `1st Suite Preference`
- `2nd Suite Preference`
- `3rd Suite Preference`
- `New to SPCN?` – values such as `Yes`, `No`, `True`, `False`
- `Role Preference Score` – numeric

Additional columns are ignored.

## Local Storage

State is auto-saved after imports, assignments, and finalizations under the key `spcn-draft-state`. On load, the app prompts to resume or start a fresh draft. To restart from scratch, refresh the page.

## Exports

- `all_assignments.csv` – all dancers with final suite assignment (blank if still unassigned)
- `suite_<name>.csv` – one file per suite (e.g. `suite_maria_clara.csv`)

Exports include UTF-8 encoded CSV content ready for spreadsheet tools.

## Tech Stack

- React 19 + TypeScript
- Vite build tooling
- Context + reducer store for deterministic draft state management
- PapaParse for CSV ingestion
- Vitest + Testing Library for automated coverage
