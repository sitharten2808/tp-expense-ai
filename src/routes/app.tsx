import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
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
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { extractReceipt } from "@/lib/receipt.functions";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "TP SmartExpense — Dashboard" },
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

const CATEGORIES = ["Meals", "Travel", "Office Supplies", "Telecoms", "Other"];

function AppShell() {
  const [tab, setTab] = useState<Tab>("new");
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const nav = [
    { id: "dashboard", icon: Home, label: "Dashboard" },
    { id: "new", icon: Upload, label: "New Submission" },
    { id: "log", icon: ListChecks, label: "Submission Log" },
    { id: "export", icon: Download, label: "Export CSV" },
  ] as const;

  return (
    <div className="min-h-screen flex bg-muted/30">
      <Toaster richColors position="top-right" />
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar border-r border-sidebar-border">
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-1">
            <span className="text-primary text-xl font-extrabold">TP</span>
            <span className="text-sidebar-foreground text-xl font-semibold">SmartExpense</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Finance Management System</p>
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
          {tab === "log" && <SubmissionLog submissions={submissions} />}
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
  const fileInput = useRef<HTMLInputElement>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgBase64, setImgBase64] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState("image/jpeg");
  const [loading, setLoading] = useState(false);
  const [extraction, setExtraction] = useState<Extraction | null>(null);

  // Form state
  const [merchant, setMerchant] = useState("");
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("MYR");
  const [category, setCategory] = useState("Meals");
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
    setCategory("Meals");
    setNotes("");
    setSubmittedBy("");
  };

  const submit = () => {
    if (!merchant || !date || !amount || !submittedBy) {
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
    onSubmit({
      id: crypto.randomUUID(),
      merchant,
      date,
      amount: Number(amount) || 0,
      currency: currency.toUpperCase(),
      category,
      language: extraction?.language_detected ?? "—",
      confidence: overall,
      submittedBy,
      notes,
      timestamp: new Date().toISOString(),
    });
    clear();
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
              <Button onClick={submit} className="flex-1">
                Submit
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
  const total = submissions.length;
  const totalMyr = submissions
    .filter((s) => s.currency === "MYR")
    .reduce((acc, s) => acc + s.amount, 0);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of submissions) map.set(s.category, (map.get(s.category) ?? 0) + 1);
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [submissions]);

  const byLang = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of submissions) map.set(s.language, (map.get(s.language) ?? 0) + 1);
    return Array.from(map.entries());
  }, [submissions]);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview of your expense submissions." />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Submissions" value={String(total)} />
        <StatCard label="Total Amount (MYR)" value={totalMyr.toFixed(2)} />
        <StatCard
          label="Categories"
          value={byCategory.length ? byCategory.map((c) => `${c.name}: ${c.value}`).join(" · ") : "—"}
          small
        />
        <StatCard
          label="Languages"
          value={byLang.length ? byLang.map(([k, v]) => `${k}: ${v}`).join(" · ") : "—"}
          small
        />
      </div>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Spend by Category</h3>
        {byCategory.length === 0 ? (
          <p className="text-muted-foreground text-sm py-10 text-center">No data yet.</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={amountByCategory(submissions)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="total" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}

function amountByCategory(subs: Submission[]) {
  const map = new Map<string, number>();
  for (const s of subs) map.set(s.category, (map.get(s.category) ?? 0) + s.amount);
  return Array.from(map.entries()).map(([name, total]) => ({ name, total: Number(total.toFixed(2)) }));
}

function StatCard({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <Card className="p-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
      <p className={`mt-2 font-bold ${small ? "text-sm leading-snug" : "text-2xl"}`}>{value}</p>
    </Card>
  );
}

/* ---------------------- Submission Log ---------------------- */

function categoryColor(c: string) {
  switch (c) {
    case "Meals":
      return "bg-warning/15 text-warning border-warning/30";
    case "Travel":
      return "bg-chart-5/15 text-chart-5 border-chart-5/30";
    case "Office Supplies":
      return "bg-accent text-accent-foreground border-primary/20";
    case "Telecoms":
      return "bg-success/15 text-success border-success/30";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function SubmissionLog({ submissions }: { submissions: Submission[] }) {
  return (
    <div>
      <PageHeader title="Submission Log" subtitle="All submitted expense claims." />
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
                  {["#", "Merchant", "Date", "Amount", "Currency", "Category", "Language", "Confidence", "Submitted By", "Timestamp"].map(
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
  const download = () => {
    if (submissions.length === 0) {
      toast.error("Nothing to export yet.");
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
    const rows = submissions.map((s) => [
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
    a.download = `tp_smartexpense_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  };

  return (
    <div>
      <PageHeader title="Export CSV" subtitle="Download all submissions as a CSV file." />
      <Card className="p-6 mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="font-medium">{submissions.length} submission(s) ready to export</p>
          <p className="text-sm text-muted-foreground">
            File name: tp_smartexpense_export_{new Date().toISOString().slice(0, 10)}.csv
          </p>
        </div>
        <Button onClick={download} size="lg">
          <Download className="h-4 w-4 mr-2" /> Download CSV
        </Button>
      </Card>

      <SubmissionLog submissions={submissions} />
    </div>
  );
}
