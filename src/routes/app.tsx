import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Home,
  Upload,
  ListChecks,
  Download,
  Sparkles,
  Loader2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { deleteReceiptLog, extractReceipt, listReceiptLogs, saveReceiptLog } from "@/lib/receipt.functions";
import { getDailyRates } from "@/lib/currency.functions";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "TP SmartReceipt — Dashboard" },
      { name: "description", content: "AI-powered expense submission tool." },
    ],
  }),
  component: AppShell,
});

type Tab = "dashboard" | "new" | "log" | "export";

type Confidence = "high" | "medium" | "low";

type Submission = {
  id: string;
  merchant: string;
  date: string;
  amount: number;
  currency: string;
  category: string;
  language: string;
  confidence: Confidence;
  submittedBy: string;
  notes: string;
  timestamp: string;
};

const CATEGORIES = [
  "Housing & Utilities",
  "Food & Dining",
  "Transportation",
  "Personal & Healthcare",
  "Entertainment & Leisure",
  "Shopping & General",
  "Financial Obligations",
  "Education & Professional",
  "Others",
];

function makeSubmissionId(): string {
  if (typeof globalThis !== "undefined" && globalThis.crypto && "randomUUID" in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }
  return `sub_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function AppShell() {
  const [tab, setTab] = useState<Tab>("new");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const loadLogs = useServerFn(listReceiptLogs);
  const deleteLog = useServerFn(deleteReceiptLog);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchLogs = async () => {
      try {
        const logs = await loadLogs();
        if (!active) return;
        setSubmissions(
          logs.map((log) => {
            const vals = Object.values(log.confidence ?? {});
            const overall: Confidence = vals.includes("low")
              ? "low"
              : vals.includes("medium")
                ? "medium"
                : "high";
            return {
              id: log.id,
              merchant: log.merchant_name,
              date: log.date,
              amount: log.total_amount,
              currency: log.currency.toUpperCase(),
              category: log.category,
              language: log.language_detected,
              confidence: overall,
              submittedBy: log.submitted_by,
              notes: log.notes,
              timestamp: log.timestamp,
            };
          }),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load receipt logs";
        toast.error(msg);
      }
    };
    fetchLogs();
    return () => {
      active = false;
    };
  }, [loadLogs]);

  const nav = [
    { id: "dashboard", icon: Home, label: "Dashboard" },
    { id: "new", icon: Upload, label: "New Submission" },
    { id: "log", icon: ListChecks, label: "Submitted Receipts" },
    { id: "export", icon: Download, label: "Export CSV" },
  ] as const;

  const handleDeleteSubmission = async (id: string) => {
    try {
      setDeletingId(id);
      await deleteLog({ data: { id } });
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
      toast.success("Submission deleted");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete submission";
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen flex bg-muted/30">
      <Toaster richColors position="top-right" />
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar border-r border-sidebar-border">
        <div className="p-5 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-1 hover:opacity-80 transition-opacity">
            <span className="text-primary text-xl font-extrabold">TP</span>
            <span className="text-sidebar-foreground text-xl font-semibold">SmartReceipt</span>
          </Link>
          <p className="text-xs text-muted-foreground mt-1">Smart Receipt System</p>
        </div>
        <nav className="p-3 flex-1">
          {nav.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1 ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border text-xs text-muted-foreground">
          © 2025 TP Malaysia
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-sidebar border-b z-20 px-3 py-2 flex gap-1 overflow-x-auto">
        {nav.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs whitespace-nowrap ${
              tab === item.id ? "bg-primary text-primary-foreground" : "text-foreground/70"
            }`}
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </button>
        ))}
      </div>

      {/* Main */}
      <main className="flex-1 min-w-0 mt-14 md:mt-0">
        <div className="max-w-6xl mx-auto p-6 md:p-10">
          {tab === "new" && (
            <NewSubmission
              onSubmit={(s) => {
                setSubmissions((prev) => [s, ...prev]);
                toast.success("Receipt submitted successfully");
                setTab("log");
              }}
            />
          )}
          {tab === "dashboard" && <Dashboard submissions={submissions} />}
          {tab === "log" && (
            <SubmissionLog
              submissions={submissions}
              deletingId={deletingId}
              onDelete={handleDeleteSubmission}
            />
          )}
          {tab === "export" && <ExportCSV submissions={submissions} />}
        </div>
      </main>
    </div>
  );
}

/* ---------------------- New Submission ---------------------- */

type Extraction = Awaited<ReturnType<typeof extractReceipt>>;

function NewSubmission({ onSubmit }: { onSubmit: (s: Submission) => void }) {
  const extract = useServerFn(extractReceipt);
  const saveLog = useServerFn(saveReceiptLog);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgBase64, setImgBase64] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState("image/jpeg");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [extraction, setExtraction] = useState<Extraction | null>(null);

  // Form state
  const [merchant, setMerchant] = useState("");
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("MYR");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [notes, setNotes] = useState("");
  const [submittedBy, setSubmittedBy] = useState("");

  const handleFile = useCallback((file: File) => {
    setExtraction(null);
    setMediaType(file.type || "image/jpeg");
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImgUrl(result);
      const base64 = result.split(",")[1] ?? "";
      setImgBase64(base64);
    };
    reader.readAsDataURL(file);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("image/")) handleFile(file);
    },
    [handleFile],
  );

  const runExtraction = async () => {
    if (!imgBase64) {
      toast.error("Please upload a receipt image first");
      return;
    }
    setLoading(true);
    try {
      const data = await extract({ data: { imageBase64: imgBase64, mediaType } });
      setExtraction(data);
      setMerchant(data.merchant_name ?? "");
      setDate(data.date ?? "");
      setAmount(String(data.total_amount ?? ""));
      setCurrency(data.currency ?? "MYR");
      if (data.category && CATEGORIES.includes(data.category)) setCategory(data.category);
      toast.success("Receipt extracted");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Extraction failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setImgUrl(null);
    setImgBase64(null);
    setExtraction(null);
    setMerchant("");
    setDate("");
    setAmount("");
    setCurrency("MYR");
    setCategory(CATEGORIES[0]);
    setNotes("");
    setSubmittedBy("");
  };

  const submit = async () => {
    if (!merchant || !date || !amount) {
      toast.error("Please fill merchant, date, amount, and submitted by");
      return;
    }
    const overall: Confidence = (() => {
      const c = extraction?.confidence;
      if (!c) return "medium";
      const vals = Object.values(c);
      if (vals.includes("low")) return "low";
      if (vals.includes("medium")) return "medium";
      return "high";
    })();
    const normalizedAmount = Number(amount) || 0;
    const normalizedCurrency = currency.toUpperCase();
    const normalizedLanguage = extraction?.language_detected ?? "Other";
    const timestamp = new Date().toISOString();
    try {
      setSubmitting(true);
      await saveLog({
        data: {
          merchant_name: merchant,
          date,
          total_amount: normalizedAmount,
          currency: normalizedCurrency,
          category,
          language_detected: normalizedLanguage,
          confidence: extraction?.confidence ?? {},
          submitted_by: submittedBy,
          notes,
        },
      });
      onSubmit({
        id: makeSubmissionId(),
        merchant,
        date,
        amount: normalizedAmount,
        currency: normalizedCurrency,
        category,
        language: normalizedLanguage,
        confidence: overall,
        submittedBy,
        notes,
        timestamp,
      });
      clear();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save submission";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const langLabel = (() => {
    const l = extraction?.language_detected;
    if (l === "EN") return "🌐 English detected";
    if (l === "MS") return "🌐 Bahasa Malaysia detected";
    if (l === "ZH") return "🌐 中文 detected";
    if (l) return `🌐 ${l} detected`;
    return null;
  })();

  return (
    <div>
      <PageHeader title="New Submission" subtitle="Upload a receipt and let AI fill the form." />
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Upload */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">1 · Upload Receipt</h3>

          {!imgUrl ? (
            <div
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInput.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-10 text-center hover:border-primary hover:bg-accent/30 transition-colors cursor-pointer"
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">Drop receipt image here</p>
              <p className="text-sm text-muted-foreground mt-1">or click to browse (JPG, PNG)</p>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <input
                ref={cameraInput}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden border bg-muted">
              <img src={imgUrl} alt="Receipt preview" className="w-full max-h-[420px] object-contain bg-white" />
              <button
                onClick={clear}
                className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/90 border flex items-center justify-center hover:bg-background"
                aria-label="Remove"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <Button onClick={() => cameraInput.current?.click()} variant="outline" disabled={loading}>
              Take Photo
            </Button>
            <Button onClick={runExtraction} disabled={!imgBase64 || loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Extracting receipt data...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" /> Extract with AI
                </>
              )}
            </Button>
          </div>

          {extraction && (
            <div className="mt-5 rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold">AI Extraction Status</p>
                {langLabel && (
                  <Badge variant="secondary" className="bg-accent text-accent-foreground">
                    {langLabel}
                  </Badge>
                )}
              </div>
              <div className="space-y-1.5 text-sm">
                <ConfidenceRow label="Merchant name" value={extraction.confidence?.merchant_name} />
                <ConfidenceRow label="Date" value={extraction.confidence?.date} />
                <ConfidenceRow label="Total amount" value={extraction.confidence?.total_amount} />
                <ConfidenceRow label="Currency" value={extraction.confidence?.currency} />
              </div>
            </div>
          )}
        </Card>

        {/* Right: Form */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">2 · Review & Submit</h3>
          <div className="space-y-4">
            <Field label="Merchant Name">
              <Input value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="e.g. Starbucks KLCC" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date">
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label="Total Amount">
                <Input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Currency">
                <Input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="MYR" />
              </Field>
              <Field label="Expense Category">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Notes (optional)">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes..." rows={3} />
            </Field>
            <Field label="Submitted By">
              <Input value={submittedBy} onChange={(e) => setSubmittedBy(e.target.value)} placeholder="Your name" />
            </Field>

            <div className="flex gap-2 pt-2">
              <Button onClick={submit} className="flex-1" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...
                  </>
                ) : (
                  "Submit"
                )}
              </Button>
              <Button onClick={clear} variant="outline">
                Clear
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ConfidenceRow({ label, value }: { label: string; value?: string }) {
  const v = (value ?? "medium").toLowerCase();
  const high = v === "high";
  const low = v === "low";
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`inline-flex items-center gap-1 font-medium ${
          high ? "text-success" : low ? "text-destructive" : "text-warning"
        }`}
      >
        {high ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
        {high ? "High" : low ? "Low" : "Medium"}
      </span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}

function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
      {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}

/* ---------------------- Dashboard ---------------------- */

function Dashboard({ submissions }: { submissions: Submission[] }) {
  const [displayCurrency, setDisplayCurrency] = useState("MYR");
  const [fxBase, setFxBase] = useState("EUR");
  const [fxRates, setFxRates] = useState<Record<string, number>>({ EUR: 1 });
  const [availableFxCurrencies, setAvailableFxCurrencies] = useState<string[]>(["EUR"]);
  const [ratesDate, setRatesDate] = useState<string>("");
  const loadDailyRates = useServerFn(getDailyRates);

  useEffect(() => {
    let active = true;
    const fetchRates = async () => {
      try {
        const fx = await loadDailyRates();
        if (!active) return;
        setFxBase(fx.base);
        setFxRates(fx.rates);
        setAvailableFxCurrencies(fx.availableCurrencies);
        setRatesDate(fx.date);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load daily exchange rates";
        toast.error(msg);
      }
    };
    fetchRates();
    return () => {
      active = false;
    };
  }, [loadDailyRates]);

  const total = submissions.length;
  const availableCurrencies = useMemo(() => {
    const set = new Set<string>();
    set.add("MYR");
    for (const c of availableFxCurrencies) set.add(c.toUpperCase());
    for (const s of submissions) {
      const normalized = s.currency.toUpperCase();
      if (normalized) set.add(normalized);
    }
    const sorted = Array.from(set).sort();
    if (set.has("MYR")) {
      return ["MYR", ...sorted.filter((c) => c !== "MYR")];
    }
    return sorted;
  }, [submissions, availableFxCurrencies]);

  useEffect(() => {
    if (displayCurrency !== "MYR" && !availableCurrencies.includes(displayCurrency) && availableCurrencies.length > 0) {
      setDisplayCurrency(availableCurrencies[0]);
    }
  }, [availableCurrencies, displayCurrency]);

  const convertAmount = useCallback((amount: number, fromCurrency: string, toCurrency: string) => {
    const alias: Record<string, string> = {
      NTD: "TWD",
      RMB: "CNY",
    };
    const from = alias[fromCurrency.toUpperCase()] ?? fromCurrency.toUpperCase();
    const to = alias[toCurrency.toUpperCase()] ?? toCurrency.toUpperCase();
    if (from === to) return amount;

    const fromPerBase = from === fxBase ? 1 : fxRates[from];
    const toPerBase = to === fxBase ? 1 : fxRates[to];
    if (!fromPerBase || !toPerBase) return amount;

    // Rates are stored as "1 base currency = X target currency".
    const inBase = amount / fromPerBase;
    return inBase * toPerBase;
  }, [fxRates, fxBase]);

  const totalConverted = useMemo(
    () => submissions.reduce((acc, s) => acc + convertAmount(s.amount, s.currency, displayCurrency), 0),
    [submissions, displayCurrency, convertAmount],
  );

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of submissions) map.set(s.category, (map.get(s.category) ?? 0) + 1);
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [submissions]);

  const amountByCategoryData = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of submissions) {
      map.set(
        s.category,
        (map.get(s.category) ?? 0) + convertAmount(s.amount, s.currency, displayCurrency),
      );
    }
    return Array.from(map.entries()).map(([name, totalAmount]) => ({
      name,
      total: Number(totalAmount.toFixed(2)),
    }));
  }, [submissions, displayCurrency, convertAmount]);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview of your expense submissions." />
      <div className="mb-4 flex items-center justify-end gap-2">
        {ratesDate && <p className="text-xs text-muted-foreground mr-2">Rates date: {ratesDate}</p>}
        <Label className="text-xs text-muted-foreground">Currency:</Label>
        <div className="w-36">
          <Select value={displayCurrency} onValueChange={setDisplayCurrency}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableCurrencies.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard label="Total Receipts" value={String(total)} />
        <StatCard label={`Total Amount (${displayCurrency})`} value={totalConverted.toFixed(2)} />
        <StatCard
          label="Categories"
          value={byCategory.length ? byCategory.map((c) => `${c.name}: ${c.value}`).join(" · ") : "—"}
          small
        />
      </div>

      <Card className="p-6 md:p-8">
        <h3 className="font-semibold mb-4">Spend by Category</h3>
        {byCategory.length === 0 ? (
          <p className="text-muted-foreground text-sm py-10 text-center">No data yet.</p>
        ) : (
          <div className="h-[420px] md:h-[460px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  formatter={(value, name) => {
                    const numericValue = typeof value === "number" ? value : Number(value ?? 0);
                    return [`${numericValue.toFixed(2)} ${displayCurrency}`, String(name)];
                  }}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                />
                <Pie
                  data={amountByCategoryData}
                  dataKey="total"
                  nameKey="name"
                  cx="50%"
                  cy="44%"
                  innerRadius={78}
                  outerRadius={128}
                  paddingAngle={2}
                  labelLine={false}
                  label={(props) => renderFinancePieLabel(props, displayCurrency)}
                >
                  {amountByCategoryData.map((entry, index) => (
                    <Cell key={entry.name} fill={categoryChartColor(entry.name, index)} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" height={56} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <Card className="p-6 min-h-[116px]">
      <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
      <p className={`mt-3 font-bold ${small ? "text-base leading-relaxed" : "text-3xl"}`}>{value}</p>
    </Card>
  );
}

function categoryChartColor(category: string, index?: number): string {
  const vibrantFallbackPalette = [
    "#003a7d", // Dark Blue
    "#008dff", // Med Blue
    "#ff73b6", // Pink
    "#c701ff", // Purple
    "#4ecb8d", // Green
    "#ff9d3a", // Orange
    "#f9e858", // Yellow
    "#d83034", // Red
    "#00d1d1", // Extra contrast: Teal
    "#2d1b69", // Extra contrast: Deep Indigo
  ];

  switch (category) {
    case "Housing & Utilities":
      return "#003a7d";
    case "Food & Dining":
      return "#4ecb8d";
    case "Transportation":
      return "#008dff";
    case "Personal & Healthcare":
      return "#d83034";
    case "Entertainment & Leisure":
      return "#ff73b6";
    case "Shopping & General":
      return "#ff9d3a";
    case "Financial Obligations":
      return "#c701ff";
    case "Education & Professional":
      return "#2d1b69";
    case "Others":
      return "#f9e858";
    default:
      if (typeof index === "number") return vibrantFallbackPalette[index % vibrantFallbackPalette.length];
      return vibrantFallbackPalette[0];
  }
}

type PieLabelProps = {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
  value?: number | string;
};

function renderFinancePieLabel(props: PieLabelProps, currency: string) {
  const RADIAN = Math.PI / 180;
  const cx = props.cx ?? 0;
  const cy = props.cy ?? 0;
  const midAngle = props.midAngle ?? 0;
  const innerRadius = props.innerRadius ?? 0;
  const outerRadius = props.outerRadius ?? 0;
  const percent = props.percent ?? 0;
  const rawValue = props.value ?? 0;
  const value = typeof rawValue === "number" ? rawValue : Number(rawValue);

  const insideR = innerRadius + (outerRadius - innerRadius) * 0.5;
  const insideX = cx + insideR * Math.cos(-midAngle * RADIAN);
  const insideY = cy + insideR * Math.sin(-midAngle * RADIAN);

  const startX = cx + outerRadius * Math.cos(-midAngle * RADIAN);
  const startY = cy + outerRadius * Math.sin(-midAngle * RADIAN);
  const midX = cx + (outerRadius + 26) * Math.cos(-midAngle * RADIAN);
  const midY = cy + (outerRadius + 26) * Math.sin(-midAngle * RADIAN);
  const endX = midX + (Math.cos(-midAngle * RADIAN) >= 0 ? 46 : -46);
  const endY = midY;
  const anchor = endX >= cx ? "start" : "end";

  return (
    <g>
      <text x={insideX} y={insideY} fill="#ffffff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700}>
        {(percent * 100).toFixed(0)}%
      </text>
      <path d={`M${startX},${startY} L${midX},${midY} L${endX},${endY}`} stroke="currentColor" strokeWidth={1.5} fill="none" opacity={0.55} />
      <circle cx={endX} cy={endY} r={2.2} fill="currentColor" opacity={0.6} />
      <text x={endX + (anchor === "start" ? 8 : -8)} y={endY - 2} fill="currentColor" textAnchor={anchor} fontSize={12} fontWeight={700}>
        {Number.isFinite(value) ? value.toFixed(2) : "0.00"} {currency}
      </text>
    </g>
  );
}

/* ---------------------- Submission Log ---------------------- */

function categoryColor(c: string) {
  switch (c) {
    case "Food & Dining":
      return "bg-warning/15 text-warning border-warning/30";
    case "Transportation":
      return "bg-chart-5/15 text-chart-5 border-chart-5/30";
    case "Education & Professional":
      return "bg-accent text-accent-foreground border-primary/20";
    case "Personal & Healthcare":
      return "bg-success/15 text-success border-success/30";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function SubmissionLog({
  submissions,
  onDelete,
  deletingId,
}: {
  submissions: Submission[];
  onDelete: (id: string) => void;
  deletingId: string | null;
}) {
  return (
    <div>
      <PageHeader title="Submitted Receipts" subtitle="All submitted Receipts." />
      <Card className="overflow-hidden">
        {submissions.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            No submissions yet. Upload a receipt to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  {["#", "Merchant", "Date", "Amount", "Currency", "Category", "Language", "Confidence", "Submitted By", "Timestamp", "Action"].map(
                    (h) => (
                      <th key={h} className="text-left font-medium px-3 py-3 whitespace-nowrap">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {submissions.map((s, i) => (
                  <tr key={s.id} className="border-t hover:bg-muted/30">
                    <td className="px-3 py-3">{i + 1}</td>
                    <td className="px-3 py-3 font-medium">{s.merchant}</td>
                    <td className="px-3 py-3">{s.date}</td>
                    <td className="px-3 py-3">{s.amount.toFixed(2)}</td>
                    <td className="px-3 py-3">{s.currency}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full border text-xs font-medium ${categoryColor(s.category)}`}>
                        {s.category}
                      </span>
                    </td>
                    <td className="px-3 py-3">{s.language}</td>
                    <td className="px-3 py-3 capitalize">{s.confidence}</td>
                    <td className="px-3 py-3">{s.submittedBy}</td>
                    <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(s.timestamp).toLocaleString()}
                    </td>
                    <td className="px-3 py-3">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onDelete(s.id)}
                        disabled={deletingId === s.id}
                        aria-label="Delete submission"
                        className="text-destructive hover:text-destructive"
                      >
                        {deletingId === s.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ---------------------- Export CSV ---------------------- */

function ExportCSV({ submissions }: { submissions: Submission[] }) {
  const todayIsoDate = new Date().toLocaleDateString('en-GB', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).split('/').reverse().join('-'); // Converts DD/MM/YYYY to YYYY-MM-DD
  const [fileName, setFileName] = useState(`tp_smartreceipt_export_${todayIsoDate}`);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelectedIds(new Set(submissions.map((s) => s.id)));
  }, [submissions]);

  const allSelected = submissions.length > 0 && selectedIds.size === submissions.length;
  const selectedSubmissions = submissions.filter((s) => selectedIds.has(s.id));

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(submissions.map((s) => s.id)));
      return;
    }
    setSelectedIds(new Set());
  };

  const toggleRow = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const download = () => {
    if (submissions.length === 0) {
      toast.error("Nothing to export yet.");
      return;
    }
    if (selectedSubmissions.length === 0) {
      toast.error("Please select at least one row to export.");
      return;
    }
    const headers = [
      "Merchant",
      "Date",
      "Amount",
      "Currency",
      "Category",
      "Language",
      "Confidence",
      "Submitted By",
      "Notes",
      "Timestamp",
    ];
    const rows = selectedSubmissions.map((s) => [
      s.merchant,
      s.date,
      s.amount.toString(),
      s.currency,
      s.category,
      s.language,
      s.confidence,
      s.submittedBy,
      s.notes,
      s.timestamp,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const trimmedFileName = fileName.trim() || `tp_smartreceipt_export_${todayIsoDate}`;
    a.download = trimmedFileName.toLowerCase().endsWith(".csv") ? trimmedFileName : `${trimmedFileName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`CSV downloaded (${selectedSubmissions.length} row${selectedSubmissions.length > 1 ? "s" : ""})`);
  };

  return (
    <div>
      <PageHeader title="Export CSV" subtitle="Download all submissions as a CSV file." />
      <Card className="p-6 mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="font-medium">
            {selectedSubmissions.length} of {submissions.length} submission(s) selected
          </p>
          <div className="mt-2">
            <Label className="text-xs text-muted-foreground mb-1 block">File name</Label>
            <Input
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder={`tp_smartreceipt_export_${todayIsoDate}`}
              className="w-72 max-w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">.csv will be added automatically if missing.</p>
          </div>
        </div>
        <Button onClick={download} size="lg">
          <Download className="h-4 w-4 mr-2" /> Download CSV
        </Button>
      </Card>

      <Card className="overflow-hidden">
        {submissions.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No submissions yet. Upload a receipt to get started.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-3 py-3 whitespace-nowrap">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={(e) => toggleSelectAll(e.target.checked)}
                      />
                      Select all
                    </label>
                  </th>
                  {["#", "Merchant", "Date", "Amount", "Currency", "Category", "Submitted By", "Timestamp"].map((h) => (
                    <th key={h} className="text-left font-medium px-3 py-3 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {submissions.map((s, i) => (
                  <tr key={s.id} className="border-t hover:bg-muted/30">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(s.id)}
                        onChange={(e) => toggleRow(s.id, e.target.checked)}
                        aria-label={`Select row ${i + 1}`}
                      />
                    </td>
                    <td className="px-3 py-3">{i + 1}</td>
                    <td className="px-3 py-3 font-medium">{s.merchant}</td>
                    <td className="px-3 py-3">{s.date}</td>
                    <td className="px-3 py-3">{s.amount.toFixed(2)}</td>
                    <td className="px-3 py-3">{s.currency}</td>
                    <td className="px-3 py-3">{s.category}</td>
                    <td className="px-3 py-3">{s.submittedBy}</td>
                    <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(s.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
