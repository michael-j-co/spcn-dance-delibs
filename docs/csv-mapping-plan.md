# Flexible CSV Mapping Implementation Plan

This plan introduces a header‑agnostic CSV import flow that reads all columns, lets users map them to required fields via a UI, and persists mappings for reuse.

## Goals
- Parse CSVs with arbitrary header names.
- Require user confirmation of column mappings when unknown.
- Keep existing data model and validations.
- Persist chosen mappings (per header signature) to reduce friction.

## Required Fields (All Mandatory)
- Full Name
- 1st Pref
- 2nd Pref
- 3rd Pref
- M/F Score
- New?

Note: “New?” cannot be skipped.

## High-Level Flow
1. User selects CSV file.
2. Parse headers and first N rows (e.g., 20) as raw data.
3. Attempt auto-detection (heuristics + saved mappings).
4. If mapping incomplete/ambiguous, open a Column Mapping UI:
   - Show list of required fields and dropdowns of detected columns.
   - Show sample values for each candidate column.
   - Validate: all required fields must be mapped; no duplicates.
5. Apply confirmed mapping to parse Dancer[].
6. Show the existing import preview & summary; user proceeds.

## Library Changes (app/src/lib/csv.ts)
Add these new types and functions (non-breaking; keep existing APIs):

- Types
  - `type FieldKey = 'fullName' | 'pref1' | 'pref2' | 'pref3' | 'roleScore' | 'isNew'`
  - `type ColumnMapping = Record<FieldKey, string>` // maps field → header name

- New functions
  - `parseCsv(file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }>`
    - Uses Papa to return raw rows and header list (no validation/mapping).
  - `autoDetectMapping(headers: string[]): Partial<ColumnMapping>`
    - Case/space/punctuation-insensitive; alias matching and keyword search.
    - Aliases (examples):
      - fullName: ["full name", "name", "full_name"]
      - pref1/pref2/pref3: ["1st pref", "first preference", "1st suite preference", ...]
      - roleScore: ["role preference score", "m/f score", "mf score"]
      - isNew: ["new", "new to spcn?", "first time", "returning?", etc.] (map yes/true/y)
  - `parseDancersWithMapping(rows, mapping): Dancer[]`
    - Converts rows using mapping and existing normalization:
      - suites via `normalizeSuiteName`
      - `roleScore` via numeric parse (throws if NaN)
      - `isNew` via boolean parser (yes/true/y)
  - `validateMapping(mapping, headers): { ok: boolean; errors: string[] }`
    - Ensures every required `FieldKey` exists and maps to a header present.
    - Ensures uniqueness of selected headers.

- Backwards compatibility
  - Keep `parseDancersFromCsv(file)` but refactor internally to call the new pipeline with a fixed mapping matching current REQUIRED_COLUMNS so existing flows still work.

## UI Changes (ImportScreen)
- After file selection:
  - Call `parseCsv(file)` to get headers + preview rows.
  - Load saved mapping by header signature (sorted headers join) from `localStorage`.
  - Merge with `autoDetectMapping(headers)`; if any required fields unmapped → show Column Mapper UI.

- ColumnMapperModal (new component)
  - Props: `headers`, `previewRows`, `initialMapping`, `onConfirm(mapping)`, `onCancel()`.
  - Each required field has a Select of headers (plus "— Select —").
  - Under each Select, show 2–3 sample values for the currently selected header.
  - Validation on confirm: all fields mapped, unique columns.
  - Save mapping to `localStorage` keyed by a header signature.

- Import flow integration
  - Once mapping confirmed, call `parseDancersWithMapping(rows, mapping)`.
  - Continue with existing preview, gaps alert, and “Start Draft”.

## Heuristics & Aliases
- Normalize headers by:
  - Lowercasing
  - Removing diacritics and punctuation
  - Collapsing whitespace
- Simple matching strategies:
  - Exact alias match
  - Starts/contains key terms (e.g., "1" + "pref", "first", "1st", etc.)
  - Prefer more specific aliases over generic ones

## Persistence
- Key: `csv-mapping::<headerSignature>` where headerSignature is a stable fingerprint, e.g., `sha1(headers.sort().join('|'))` or simply the sorted joined string if hashing not preferred.
- Value: `ColumnMapping` JSON.

## Validation Rules
- All required FieldKeys are present in the mapping.
- Each FieldKey maps to an existing header.
- No duplicate header selections across fields.
- While parsing rows:
  - Full Name must be non-empty; throw with row context.
  - Role score must be numeric; throw with row context.

## Accessibility & UX
- Keyboard navigable selects.
- Clear error messages and inline validation hints.
- Show a short legend for expected field meanings.
- Provide “Reset mapping” to clear saved config.

## Testing
- Unit tests for:
  - `autoDetectMapping` on varied header sets
  - `validateMapping` errors (missing/duplicate)
  - `parseDancersWithMapping` correctness and error cases
- Integration tests (where present) for Import flow with a mocked CSV.

## Rollout Strategy
- Phase 1: Library functions + UI modal behind automatic trigger (only shows when needed).
- Phase 2: Improve heuristics from real-world header examples.
- Phase 3: Option to edit/save multiple named mappings.

## Risks & Mitigations
- Overzealous heuristics → allow easy manual override.
- Non-ASCII headers → normalization pipeline handles diacritics.
- Conflicting columns → require explicit user choice; warn on ambiguity.

## Deliverables
- New/updated files:
  - `app/src/lib/csv.ts` (new mapping API + refactor)
  - `app/src/components/ColumnMapperModal.tsx` (new)
  - `app/src/pages/ImportScreen.tsx` (integrate flow)
  - Tests for csv utilities and mapping logic
  - Docs: this plan; brief README/PRD notes

## Definition of Done
- Users can import CSVs with non-standard headers by selecting mappings once.
- Mappings persist and auto-apply for similar files.
- All six required fields are enforced; clear errors on invalid rows.

