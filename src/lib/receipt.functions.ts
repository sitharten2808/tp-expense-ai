import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { getReceiptLogsCollection } from "./firebase.server";

const EXPENSE_CATEGORIES = [
  "Housing & Utilities",
  "Food & Dining",
  "Transportation",
  "Personal & Healthcare",
  "Entertainment & Leisure",
  "Shopping & General",
  "Financial Obligations",
  "Education & Professional",
  "Others",
] as const;

const InputSchema = z.object({
  imageBase64: z.string().min(10),
  mediaType: z.string().default("image/jpeg"),
});

const CategorySchema = z.enum(EXPENSE_CATEGORIES);

/** Gemini may return null when no date is visible on the receipt; we normalize to "". */
const receiptDateField = z.preprocess(
  (val: unknown) => (val === null || val === undefined ? "" : val),
  z.string(),
);

/**
 * Receipts usually show symbols or local names (RM, S$, Ringgit), while FX APIs need ISO 4217.
 * Gemini also sometimes returns wrong guesses when the total has no explicit currency.
 */
function normalizeExtractedCurrency(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "MYR";

  const compact = trimmed.replace(/\s+/g, "");
  const key = compact.toUpperCase();

  const aliases: Record<string, string> = {
    RM: "MYR",
    RINGGIT: "MYR",
    MYR: "MYR",
    MALAYSIANRINGGIT: "MYR",
    "S$": "SGD",
    "SG$": "SGD",
    SGD: "SGD",
    SINGAPORE: "SGD",
    "US$": "USD",
    USD: "USD",
    "AU$": "AUD",
    AUD: "AUD",
    "CA$": "CAD",
    CAD: "CAD",
    "HK$": "HKD",
    HKD: "HKD",
    "NT$": "TWD",
    NTD: "TWD",
    TWD: "TWD",
    RMB: "CNY",
    CNY: "CNY",
    YUAN: "CNY",
    EUR: "EUR",
    EURO: "EUR",
    "€": "EUR",
    GBP: "GBP",
    "£": "GBP",
    JPY: "JPY",
    THB: "THB",
    BAHT: "THB",
    IDR: "IDR",
    RP: "IDR",
    PHP: "PHP",
    VND: "VND",
    INR: "INR",
    KRW: "KRW",
    WON: "KRW",
  };

  if (aliases[key]) return aliases[key];

  if (/^[A-Z]{3}$/.test(key)) return key;

  // Amount glued to symbol (e.g. RM50.00, US$10) — check longer prefixes first.
  if (key.startsWith("RMB")) return "CNY";
  if (key.startsWith("RM")) return "MYR";

  const symbolPrefixes: Array<{ prefix: string; iso: string }> = [
    { prefix: "SG$", iso: "SGD" },
    { prefix: "S$", iso: "SGD" },
    { prefix: "US$", iso: "USD" },
    { prefix: "NT$", iso: "TWD" },
    { prefix: "AU$", iso: "AUD" },
    { prefix: "CA$", iso: "CAD" },
    { prefix: "HK$", iso: "HKD" },
  ];
  for (const { prefix, iso } of symbolPrefixes) {
    if (key.startsWith(prefix)) return iso;
  }

  if (trimmed.startsWith("€")) return "EUR";
  if (trimmed.startsWith("£")) return "GBP";

  const lettersOnly = key.replace(/[^A-Z]/g, "");
  if (/^[A-Z]{3}$/.test(lettersOnly)) return lettersOnly;

  return "MYR";
}

const receiptCurrencyField = z.preprocess((val: unknown) => {
  if (val === null || val === undefined) return "MYR";
  if (typeof val !== "string") return "MYR";
  return normalizeExtractedCurrency(val);
}, z.string().length(3).regex(/^[A-Z]{3}$/));

const ReceiptSchema = z.object({
  merchant_name: z.string(),
  date: receiptDateField,
  total_amount: z.number(),
  currency: receiptCurrencyField,
  category: CategorySchema,
  language_detected: z.string(),
  confidence: z.record(z.string()),
});

const ReceiptLogInputSchema = z.object({
  merchant_name: z.string(),
  date: receiptDateField,
  total_amount: z.number(),
  currency: receiptCurrencyField,
  category: z.string(),
  language_detected: z.string(),
  confidence: z.record(z.string()),
  submitted_by: z.string(),
  notes: z.string().default(""),
});

const DeleteReceiptLogInputSchema = z.object({
  id: z.string().min(1),
});

async function inferCategoryWithGemini(params: {
  apiKey: string;
  merchantName: string;
  amount: number;
  currency: string;
  date: string;
}): Promise<(typeof EXPENSE_CATEGORIES)[number]> {
  const { apiKey, merchantName, amount, currency, date } = params;
  const merchantLower = merchantName.toLowerCase();
  const hasStayKeyword =
    /\b(hotel|motel|hostel|resort|booking|agoda|airbnb|apartment|lodging|homestay)\b/.test(merchantLower);
  const hasMonthlyHousingKeyword =
    /\b(monthly|rent|rental|lease|tenancy|utilities|electric|water|internet|wifi|maintenance)\b/.test(
      merchantLower,
    );

  // Hard guardrail requested: monthly housing-related stays should be Housing & Utilities.
  if (hasStayKeyword && hasMonthlyHousingKeyword) {
    return "Housing & Utilities";
  }
  // Short-stay booking-like expenses should default to Entertainment & Leisure.
  if (hasStayKeyword) {
    return "Entertainment & Leisure";
  }

  const prompt = `You are categorizing an expense for accounting.
Choose exactly one category from this list:
${EXPENSE_CATEGORIES.join(" | ")}

Receipt details:
- merchant_name: ${merchantName}
- total_amount: ${amount}
- currency: ${currency}
- date: ${date}

Classification guidance:
- Hotel/apartment/booking nights for trips or short stays => Entertainment & Leisure.
- Monthly housing-like payments (rent/lease/utilities/internet/home maintenance) => Housing & Utilities.

Return ONLY the category text, nothing else.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0 },
      }),
    },
  );
  if (!res.ok) return "Others";

  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const content = (json.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
  const normalized = content.replace(/^["'\s]+|["'\s]+$/g, "");
  return CategorySchema.safeParse(normalized).success
    ? (normalized as (typeof EXPENSE_CATEGORIES)[number])
    : "Others";
}

export const extractReceipt = createServerFn({ method: "POST" })
  .inputValidator((data) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

    const systemPrompt =
      "You are an AI assistant for TP Malaysia's Finance Management System. Extract structured expense data from receipt images, including hardcopy paper receipts captured from phone cameras.";
    const userPrompt =
      'Extract the following fields from this receipt image and return ONLY a JSON object with no markdown or backticks: { "merchant_name": string, "date": "YYYY-MM-DD" | null | "", "total_amount": number, "currency": "ISO 4217 3-letter ONLY", "language_detected": "EN|MS|ZH|Other", "confidence": { "merchant_name": "high|medium|low", "date": "high|medium|low", "total_amount": "high|medium|low", "currency": "high|medium|low" } }. Rules: prioritize OCR robustness for hardcopy receipts, infer corrected text when minor blur/skew/shadow exists, choose total_amount from final payable/grand total, normalize date to YYYY-MM-DD when a date is visible or inferable; if no date appears on the receipt use null or "" for date and set confidence.date to low. Currency MUST be exactly three uppercase Latin letters (e.g. MYR, SGD, USD, TWD, CNY). Read currency from the receipt symbol or text near the total: map RM or Ringgit to MYR; S$ or SG$ to SGD; US$ to USD; NT$ or NTD to TWD; RMB or ¥ (when clearly China context) to CNY; £ to GBP; € to EUR. If the receipt shows no currency symbol or code, infer from merchant address, country, or language (Malaysia default MYR only when evidence supports Malaysia); if still uncertain use MYR and set confidence.currency to low.';

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: "user",
            parts: [
              { text: userPrompt },
              {
                inline_data: {
                  mime_type: data.mediaType,
                  data: data.imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`AI gateway error [${res.status}]: ${text.slice(0, 300)}`);
    }
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const content = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const cleaned = content.replace(/```json|```/g, "").trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // try to extract JSON substring
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("AI returned non-JSON response");
      parsed = JSON.parse(m[0]);
    }
    const base = z
      .object({
        merchant_name: z.string(),
        date: receiptDateField,
        total_amount: z.number(),
        currency: receiptCurrencyField,
        language_detected: z.string(),
        confidence: z.record(z.string()),
      })
      .parse(parsed);

    const category = await inferCategoryWithGemini({
      apiKey,
      merchantName: base.merchant_name,
      amount: base.total_amount,
      currency: base.currency,
      date: base.date,
    });

    return ReceiptSchema.parse({
      ...base,
      category,
    });
  });

export const saveReceiptLog = createServerFn({ method: "POST" })
  .inputValidator((data) => ReceiptLogInputSchema.parse(data))
  .handler(async ({ data }) => {
    await getReceiptLogsCollection().add({
      ...data,
      created_at: FieldValue.serverTimestamp(),
      source: "gemini-2.5-flash",
    });
    return { ok: true as const };
  });

export const listReceiptLogs = createServerFn({ method: "GET" }).handler(async () => {
  const snapshot = await getReceiptLogsCollection().orderBy("created_at", "desc").get();
  return snapshot.docs.map((doc) => {
    const data = doc.data() as {
      merchant_name?: string;
      date?: string;
      total_amount?: number;
      currency?: string;
      category?: string;
      language_detected?: string;
      confidence?: Record<string, string>;
      submitted_by?: string;
      notes?: string;
      created_at?: { toDate?: () => Date };
    };
    return {
      id: doc.id,
      merchant_name: data.merchant_name ?? "",
      date: data.date ?? "",
      total_amount: typeof data.total_amount === "number" ? data.total_amount : 0,
      currency: data.currency ?? "MYR",
      category: data.category ?? "Others",
      language_detected: data.language_detected ?? "Other",
      confidence: data.confidence ?? {},
      submitted_by: data.submitted_by ?? "",
      notes: data.notes ?? "",
      timestamp: data.created_at?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
    };
  });
});

export const deleteReceiptLog = createServerFn({ method: "POST" })
  .inputValidator((data) => DeleteReceiptLogInputSchema.parse(data))
  .handler(async ({ data }) => {
    await getReceiptLogsCollection().doc(data.id).delete();
    return { ok: true as const };
  });
