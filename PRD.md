# SPCN Suite Drafting App — Product Requirements Document (PRD)

---

## 1. Product Overview

The SPCN Suite Drafting App is a **client-side web application** that enables Suite Directors to draft dancers into 5 fixed SPCN dance suites through a structured turn-based process. The tool imports dancer data from CSV, recommends optimal draft picks based on dancer suite preferences, allows manual overrides, and exports final rosters as CSV files. Everything runs locally in the browser with no backend.

---

## 2. Scope

### 2.1 In Scope (V1)
- CSV import of dancer submissions
- Local parsing & rendering of dancer list
- 5 fixed suites: **Maria Clara, Rural, Arnis, Mindanao, Masa**
- Turn-based draft flow (fixed order repeating)
- Recommendation engine (10/6/4/1 scoring)
- Batch selection per turn (0–10 picks)
- Manual selection of non-recommended dancers
- Display of dancer details, including:
  - Role preference score
  - New to SPCN status
- Ability for a suite to “Finalize Roster” and stop drafting
- Auto-save draft state to localStorage
- Export:
  - One CSV with all final assignments
  - One CSV per suite with their roster

### 2.2 Out of Scope (V1)
- Subcommittee preferences
- Multi-user or networked drafting
- Mobile UI optimization (desktop only)
- Automatic balancing of masc/fem or experience
- Graphs/visualizations beyond simple roster counts

---

## 3. User Persona (Brief)

**Primary User:** Suite Director or designated SPCN organizer  
**Mode:** Single user controls the app on one device for the entire draft (U1)

Primary goals:
- Run the draft efficiently
- See recommendations but retain manual control
- Avoid data loss
- Export clean rosters

---

## 4. Core Use Cases

1. Upload dancer CSV and review roster
2. Run draft turn-by-turn and assign dancers
3. See recommendations for each suite’s turn
4. Manually search and add dancers if needed
5. Finalize a suite’s roster early
6. Export rosters after drafting

---

## 5. Functional Requirements (FR)

### FR-1: CSV Import
- **FR-1.1** The system shall allow uploading a CSV via `<input type="file">`.
- **FR-1.2** The system shall parse dancer data into an internal data model.
- **FR-1.3** The system shall validate required columns:
  - Full Name
  - 1st Suite Preference
  - 2nd Suite Preference
  - 3rd Suite Preference
  - New to SPCN?
  - Role Preference Score (numeric)
- **FR-1.4** If validation fails, show an error and do not start draft.

### FR-2: Data Display
- **FR-2.1** The system shall display a table of all dancers pre-draft.
- **FR-2.2** For each dancer, the UI shall show:
  - Name
  - Suite preferences (1st, 2nd, 3rd)
  - Role preference score
  - New to SPCN status

### FR-3: Draft Initialization
- **FR-3.1** Suites are fixed and must be initialized in this order:
  1. Maria Clara
  2. Rural
  3. Arnis
  4. Mindanao
  5. Masa
- **FR-3.2** Draft order repeats after all 5 suites have taken a turn.
- **FR-3.3** Initialize all dancers as “unassigned”.

### FR-4: Draft Turn Flow (Batch Mode)
- **FR-4.1** On a suite’s turn, the system shall generate **up to 10** recommended dancers.
- **FR-4.2** The Suite Director may select **0–10** dancers from the recommended list.
- **FR-4.3** The Suite Director may search and add **any** unassigned dancer not in the recommended list.
- **FR-4.4** Clicking “Confirm Picks” assigns selected dancers to that suite and ends the turn.
- **FR-4.5** Once a dancer is assigned, they must be removed from the unassigned pool.

### FR-5: Recommendation Engine
- **FR-5.1** Score dancers for the suite whose turn it is using:
  - 1st preference: 10
  - 2nd preference: 6
  - 3rd preference: 4
  - Not preferred: 1
- **FR-5.2** Sort descending by score.
- **FR-5.3** If multiple dancers share a score, **do not tiebreak**; display all, ordered alphabetically.
- **FR-5.4** Display all scored candidates but only show the top 10 as “Recommended Picks”.

### FR-6: Finalize Suite
- **FR-6.1** A Suite may click “Finalize Roster”.
- **FR-6.2** Once finalized, that Suite no longer receives turns.
- **FR-6.3** Other suites continue drafting until all dancers assigned or all suites finalized.

### FR-7: Local Save/Load
- **FR-7.1** The system shall auto-save state to localStorage after each assignment or finalization action.
- **FR-7.2** On load, if a draft exists, prompt:
  - Resume Draft
  - Start New Draft (clears saved state)
- **FR-7.3** Local saved state must include:
  - Unassigned dancers
  - Suite rosters
  - Current turn index
  - Which suites are finalized

### FR-8: Export
- **FR-8.1** On draft completion, allow export of:
  - **All Assignments CSV**
  - **One CSV per Suite**
- **FR-8.2** Exported CSVs must include:
  - Name
  - Role preference score
  - New to SPCN status
  - Assigned Suite

---

## 6. Non-Functional Requirements (NFR)

- **NFR-1** Client-only: zero backend dependencies.
- **NFR-2** Must function in Chrome and Safari desktop browsers.
- **NFR-3** Must handle 200 dancers maximum without lag.
- **NFR-4** UI must not require more than 2 clicks per turn to confirm picks.

---

## 7. Data Model

```ts
type SuiteName = "Maria Clara" | "Rural" | "Arnis" | "Mindanao" | "Masa";

type Dancer = {
  id: string; // unique generated id
  fullName: string;
  suitePrefs: {
    first: SuiteName;
    second: SuiteName;
    third: SuiteName;
  };
  roleScore: number; // 0–9
  isNew: boolean;
  assignedSuite?: SuiteName; // undefined if unassigned
};
````

Internal State:

```ts
type DraftState = {
  dancers: Dancer[];
  unassignedIds: string[];
  suites: Record<SuiteName, { ids: string[]; finalized: boolean }>;
  currentTurnSuiteIndex: number; // 0–4
};
```

---

## 8. Drafting Algorithm Requirements

### 8.1 Recommendation Scoring

```pseudo
for each unassigned dancer:
  if suite == dancer.firstPref → score=10
  else if suite == dancer.secondPref → score=6
  else if suite == dancer.thirdPref → score=4
  else score=1
```

### 8.2 Recommendation Output

* Show a “Recommended” list (max 10 dancers)
* Show a “View All Eligible” (full scored list)
* Allow selection from either list

---

## 9. UI/UX Requirements

* Desktop-first layout
* Views:

  * Import Screen
  * Draft Board (main)
  * Export Screen
* Draft Board must show:

  * Current Suite’s turn
  * Recommended list
  * Search bar to filter unassigned dancers
  * Suite rosters with counts and basic breakdown:

    * Masc/Fem role balance via roleScore
    * New/Returning counts

---

## 10. Local Save/Load Requirements

* Auto-save after:

  * CSV import
  * Assignments
  * Finalize suite
* Provide “Clear Draft Data” option

---

## 11. Export Requirements

* CSV format UTF-8
* Filenames:

  * `all_assignments.csv`
  * `suite_maria_clara.csv` (etc.)

---

## 12. Edge Cases

* No dancers list a suite as 1st/2nd/3rd → still show 1-point recommendations
* If <10 unassigned dancers remain → show fewer
* If all suites finalized and unassigned dancers remain → allow manual assignment or auto-assign with 1-point score
* Prevent assigning the same dancer twice

---

## 13. Definition of Done (AI Build)

The feature is complete when:

* All FR and NFR items met
* Draft can be fully run start to finish without error
* State persistence works across refresh
* CSV export produces correct data
* No backend required

```
