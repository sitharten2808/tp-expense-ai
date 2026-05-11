import { createServerFn } from "@tanstack/react-start";

type OpenErApiResponse = {
  result?: string;
  time_last_update_utc?: string;
  base_code?: string;
  rates?: Record<string, number | undefined>;
};

type FrankfurterResponse = {
  base?: string;
  date?: string;
  rates?: Record<string, number | undefined>;
};

type RatePayload = {
  base: string;
  date: string;
  rates: Record<string, number>;
};

function normalizeRates(base: string, rates: Record<string, number | undefined>): Record<string, number> {
  const normalized = Object.fromEntries(
    Object.entries(rates)
      .filter(([, rate]) => typeof rate === "number" && Number.isFinite(rate))
      .map(([code, rate]) => [code.toUpperCase(), rate as number]),
  );
  return {
    [base.toUpperCase()]: 1,
    ...normalized,
  };
}

async function fetchOpenErApiRates(): Promise<RatePayload> {
  const res = await fetch("https://open.er-api.com/v6/latest/USD");
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`open.er-api failed [${res.status}]: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as OpenErApiResponse;
  if (data.result !== "success" || !data.base_code || !data.rates) {
    throw new Error("open.er-api returned incomplete rate data.");
  }

  return {
    base: data.base_code.toUpperCase(),
    date: (data.time_last_update_utc ?? "").slice(0, 16) || new Date().toISOString().slice(0, 10),
    rates: normalizeRates(data.base_code, data.rates),
  };
}

async function fetchFrankfurterRates(): Promise<RatePayload> {
  const res = await fetch("https://api.frankfurter.app/latest?from=USD");
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`frankfurter failed [${res.status}]: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as FrankfurterResponse;
  if (!data.base || !data.rates) {
    throw new Error("frankfurter returned incomplete rate data.");
  }

  return {
    base: data.base.toUpperCase(),
    date: data.date ?? new Date().toISOString().slice(0, 10),
    rates: normalizeRates(data.base, data.rates),
  };
}

export const getDailyRates = createServerFn({ method: "GET" }).handler(async () => {
  let payload: RatePayload;
  try {
    payload = await fetchOpenErApiRates();
  } catch {
    payload = await fetchFrankfurterRates();
  }

  const availableCurrencies = Object.keys(payload.rates).sort();

  return {
    base: payload.base,
    date: payload.date,
    rates: payload.rates,
    availableCurrencies,
  };
});
