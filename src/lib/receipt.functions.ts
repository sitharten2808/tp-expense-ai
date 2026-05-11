import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  imageBase64: z.string().min(10),
  mediaType: z.string().default("image/jpeg"),
});

export const extractReceipt = createServerFn({ method: "POST" })
  .inputValidator((data) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt =
      "You are an AI assistant for TP Malaysia's Finance Management System. Extract structured expense data from receipt images.";
    const userPrompt =
      'Extract the following fields from this receipt image and return ONLY a JSON object with no markdown or backticks: { "merchant_name": string, "date": "YYYY-MM-DD", "total_amount": number, "currency": "3-letter code", "category": "Meals|Travel|Office Supplies|Telecoms|Other", "language_detected": "EN|MS|ZH|Other", "confidence": { "merchant_name": "high|medium|low", "date": "high|medium|low", "total_amount": "high|medium|low", "currency": "high|medium|low" } }';

    const dataUrl = `data:${data.mediaType};base64,${data.imageBase64}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`AI gateway error [${res.status}]: ${text.slice(0, 300)}`);
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content ?? "";
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
    return parsed as {
      merchant_name: string;
      date: string;
      total_amount: number;
      currency: string;
      category: string;
      language_detected: string;
      confidence: Record<string, string>;
    };
  });
