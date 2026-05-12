# TP SmartReceipt

AI receipt-to-expense automation for TP Malaysia. Upload a receipt, AI extracts the fields, review and submit to Firestore.

## Run

```bash
npm install
npm run dev
```

Create a `.env` in the project root:

```env
GEMINI_API_KEY=...
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

App runs at `http://localhost:8080` (`/` landing, `/app` dashboard).

## Model

`gemini-2.5-flash` via Google Generative Language API. Two calls per receipt:

1. **Extract** — vision call with the image, asks for JSON `{ merchant_name, date, total_amount, currency, language_detected, confidence }`.
2. **Categorize** — text call on the extracted fields, picks one of 9 categories.

### Extraction prompt (system + user)

> **System:** You are an AI assistant for TP Malaysia's Finance Management System. Extract structured expense data from receipt images.
>
> **User:** Return ONLY a JSON object: `{ merchant_name, date: "YYYY-MM-DD" | null, total_amount, currency: "ISO 4217 3-letter", language_detected: "EN|MS|ZH|Other", confidence: { ... } }`. Pick `total_amount` from the final payable/grand total. Map symbols → ISO codes (`RM`→MYR, `S$`→SGD, `US$`→USD, `NT$`→TWD, `¥`/`RMB`→CNY, `£`→GBP, `€`→EUR). If no currency is visible, default to MYR with low confidence.

### Category prompt

> Choose exactly one: Housing & Utilities | Food & Dining | Transportation | Personal & Healthcare | Entertainment & Leisure | Shopping & General | Financial Obligations | Education & Professional | Others. Hotel/booking stays → Entertainment & Leisure. Monthly rent/utilities → Housing & Utilities. Return only the category text.
