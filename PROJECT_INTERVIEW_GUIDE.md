# TP SmartReceipt - Complete Interview Guide

This document explains the project end-to-end: architecture, APIs, data flow, design decisions, and how to present it clearly in an interview.

---

## 1) Project Overview

`TP SmartReceipt` is an AI-assisted expense receipt system for TP Malaysia.

Main user outcomes:
- Upload or capture a receipt image
- Extract structured fields using Gemini
- Auto-assign expense category
- Review/edit and submit
- Persist entries to Firebase Firestore
- Analyze spending in dashboard charts
- Export selected rows to CSV

The app is built as a full-stack TypeScript app using TanStack Start + React, with server functions for backend tasks.

---

## 2) Tech Stack

Core framework and runtime:
- `@tanstack/react-start` (full-stack React framework)
- `@tanstack/react-router` (file-based routes)
- React 19 + TypeScript
- Vite

UI and charts:
- Tailwind CSS
- shadcn/radix-based UI components
- `recharts` for donut chart
- `sonner` for toast notifications
- `lucide-react` for icons

Backend integrations:
- Gemini API (`generativelanguage.googleapis.com`)
- Firebase Admin SDK + Firestore (`firebase-admin`)
- Open Exchange Rates API (via `open.er-api.com`) with Frankfurter fallback (`api.frankfurter.app`)

Validation:
- `zod` for request/response schema validation

---

## 3) High-Level Architecture

### Frontend
- Route-based UI in `src/routes/`
- Main app screen is in `src/routes/app.tsx`
- Landing page is `src/routes/index.tsx`

### Backend logic (in same codebase)
- Server functions in `src/lib/*.functions.ts` using `createServerFn`
- Firestore setup in `src/lib/firebase.server.ts`
- Custom server error handling in `src/server.ts` and `src/start.ts`

### Persistence
- Firestore collection (default: `receipt_logs`)
- Records include merchant/date/amount/currency/category/language/confidence/user notes/submitted by/timestamps/source

---

## 4) Main Modules and Responsibilities

## `src/routes/app.tsx`
- Main product UI with tabs:
  - Dashboard
  - New Submission
  - Submitted Receipts
  - Export CSV
- Loads records from Firestore via server function
- Handles submit/delete workflows
- Shows donut chart with category percentages and outside callouts
- Supports CSV row selection and custom file name

## `src/lib/receipt.functions.ts`
- `extractReceipt`:
  - Sends image to Gemini (`gemini-2.5-flash-lite`)
  - Parses/validates extraction JSON
  - Runs category inference (Gemini + business rule guardrails)
- `saveReceiptLog`:
  - Saves reviewed submission to Firestore
- `listReceiptLogs`:
  - Retrieves Firestore logs ordered by timestamp desc
- `deleteReceiptLog`:
  - Deletes a Firestore document by ID

## `src/lib/currency.functions.ts`
- `getDailyRates`
  - Fetches wide-coverage daily FX rates from `open.er-api.com` (base `USD`)
  - Falls back to Frankfurter (`from=USD`) if primary provider fails
  - Normalizes and returns all available rates/currencies
  - Used for per-receipt conversion and dashboard totals

## `src/lib/firebase.server.ts`
- Initializes Firebase Admin app with env credentials
- Normalizes multiline private key from `.env`
- Exposes collection accessor

## `src/server.ts` and `src/start.ts`
- Wrap runtime with branded error behavior
- Captures certain SSR failures and returns clean user-facing fallback page

---

## 5) End-to-End Data Flow

## A. Receipt extraction flow
1. User uploads image or taps "Take Photo" (mobile camera input).
2. Frontend converts image to base64.
3. Frontend calls `extractReceipt` server function.
4. Server sends image + extraction instructions to Gemini.
5. Server validates extracted data with Zod.
6. Server runs `inferCategoryWithGemini` for category assignment.
7. Frontend receives structured extraction and autofills form fields.

Important: extraction alone does **not** write to DB.

## B. Submission flow
1. User reviews/edits fields and presses Submit.
2. Frontend calls `saveReceiptLog`.
3. Server writes document to Firestore with server timestamp and model source.
4. Frontend updates local state and shows success toast.

## C. Load dashboard/log/export
1. On app load, frontend calls `listReceiptLogs`.
2. Server fetches Firestore documents.
3. Frontend maps data into `Submission[]`.
4. Dashboard/log/export read from that state.

## D. Delete flow
1. User clicks trash icon in Submitted Receipts row.
2. Frontend calls `deleteReceiptLog` with doc ID.
3. Server deletes Firestore doc.
4. Frontend removes row from state immediately.

## E. Currency conversion flow
1. Dashboard fetches daily rates with `getDailyRates`.
2. Default display currency is `MYR` (kept available in selector).
3. Each receipt is converted individually from source currency -> FX base -> selected display currency.
4. Converted values are then summed for total and chart metrics.

---

## 6) External APIs Used

## Gemini API
Base host:
- `https://generativelanguage.googleapis.com`

Endpoints used:
- `v1beta/models/gemini-2.5-flash-lite:generateContent`

Usage:
- Receipt image extraction (multimodal input)
- Category inference from extracted fields

Auth:
- API key via `GEMINI_API_KEY`

## FX Rates APIs
Primary endpoint:
- `https://open.er-api.com/v6/latest/USD`

Usage:
- Daily FX rates for multi-currency dashboard conversions

Fallback endpoint:
- `https://api.frankfurter.app/latest?from=USD`

## Firebase Firestore (Admin SDK)
Used operations:
- `add` (save receipt)
- `orderBy(...).get()` (list receipts)
- `doc(id).delete()` (delete receipt)

---

## 7) Environment Variables

Required for current app:

```env
GEMINI_API_KEY=...

FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Optional:

```env
FIREBASE_RECEIPT_LOGS_COLLECTION=receipt_logs
```

Notes:
- `.env` must be in project root (`tp-expense-ai/.env`)
- Restart dev server after changing env values
- Keep `\n` escaped in `FIREBASE_PRIVATE_KEY`; code converts it back

---

## 8) Key Product Decisions (Good to Explain in Interview)

- **Server functions over direct client API calls**  
  Keeps keys server-side and centralizes validation/business rules.

- **Save only on Submit**  
  Prevents noisy/incomplete records from extraction attempts.

- **Zod validation at boundaries**  
  Protects against malformed LLM output and invalid writes.

- **Model + rule hybrid categorization**  
  Gemini decides category, but business guardrails enforce known special cases (e.g., hotel short stays vs monthly housing).

- **Daily FX instead of hardcoded rates**  
  Improves realism and correctness for dashboard totals.

- **Provider fallback for FX rates**  
  Uses primary + fallback provider to avoid dashboard failures from partial/outage responses.

- **Delete operation wired through backend**  
  Ensures UI deletion and DB deletion stay consistent.

---

## 9) Security and Reliability Notes

- Gemini key and Firebase credentials are not exposed to browser code.
- Firestore writes happen on server only.
- Error responses are normalized and user-friendly via custom server wrappers.
- OCR/extraction failures are handled with explicit errors and toasts.
- Category output is constrained to controlled values.

Potential improvements to mention:
- Add auth + per-user access control
- Add Firestore security layers / tenant scoping
- Add retries/backoff for external API calls
- Add request logging and observability
- Add tests for server functions and category rules

---

## 10) UI/UX Features You Can Highlight

- Mobile-friendly upload + camera capture (`capture="environment"`)
- AI confidence indicators
- Interactive dashboard with:
  - currency selector
  - donut chart percentages
  - outside amount callouts
  - category color mapping
- Submission log with row-level delete
- CSV export with:
  - row selection (select all default)
  - custom file name
  - extension auto-fix

---

## 11) Interview Script (Short Version)

"I built a full-stack AI receipt app using TanStack Start and TypeScript.  
The frontend handles upload, review, dashboarding, and export.  
Backend logic is implemented through server functions so API keys stay private.

For extraction, I send receipt images to Gemini 2.5 Flash Lite and parse structured JSON with Zod validation.  
I run a second Gemini step for category classification, with hardcoded business overrides for specific cases like hotel stays vs monthly housing payments.

Data persistence is in Firebase Firestore via Admin SDK.  
Records are only saved when the user presses Submit, then loaded on app start for dashboard/log/export views.  
I also implemented deletion that removes both UI row and Firestore doc.

For analytics, I fetch daily FX rates from a wide-coverage provider with fallback, and convert each receipt individually into a chosen display currency.  
The dashboard uses a donut chart with percentage-in-slice labels and category spend callouts."

---

## 12) Likely Interview Questions and Suggested Answers

## Q: Why not use dedicated OCR API?
A: Gemini vision already performs OCR-like reading plus semantic extraction in one call. It simplified architecture and reduced pipeline complexity. If precision on poor scans becomes critical, I'd add image preprocessing or a dedicated OCR fallback.

## Q: How do you prevent bad AI output from breaking app logic?
A: I validate all model output with Zod on the server and fail safely. I also sanitize/parse JSON robustly and constrain category values.

## Q: How do you handle partial failures?
A: Extraction errors surface as user toasts; save is separate and only runs on submit. External API failures are caught and reported; UI remains usable.

## Q: Why fetch rates daily?
A: Hardcoded rates quickly become inaccurate. Daily rates are a practical balance between freshness and implementation complexity.

## Q: How is data consistency managed on delete?
A: Delete goes through server function -> Firestore deletion -> local state update. UI state mirrors DB result.

---

## 13) Quick File Map for Walkthrough

- `src/routes/index.tsx` -> landing page
- `src/routes/app.tsx` -> main app experience
- `src/lib/receipt.functions.ts` -> extraction/category/save/list/delete backend logic
- `src/lib/currency.functions.ts` -> daily FX rate backend logic
- `src/lib/firebase.server.ts` -> Firestore connection
- `src/routes/__root.tsx` -> root shell/meta/error boundaries
- `src/server.ts`, `src/start.ts` -> SSR/server error handling

---

If needed, create a second "demo script" document with a timed 5-minute and 10-minute presentation version.
