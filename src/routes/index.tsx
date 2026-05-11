import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScanLine, Languages, BarChart3, ArrowRight, Upload, Sparkles, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TP SmartReceipt — Automate Expense Claims with AI" },
      {
        name: "description",
        content:
          "Upload a receipt. Let AI extract the details. Review, edit, and submit in seconds. Built for TP Malaysia's Finance Team.",
      },
      { property: "og:title", content: "TP SmartReceipt — Automate Expense Claims with AI" },
      {
        property: "og:description",
        content: "AI-powered receipt-to-expense automation for TP Malaysia.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-1 font-semibold tracking-tight">
            <span className="text-white text-2xl font-extrabold">TP</span>
            <span className="text-white/90 text-2xl">SmartReceipt</span>
          </div>
          <Link to="/app">
            <Button variant="secondary" className="bg-white text-primary hover:bg-white/90">
              Start Now
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="tp-hero-gradient relative text-white">
        <div className="max-w-7xl mx-auto px-6 pt-36 pb-28 md:pt-44 md:pb-36">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 backdrop-blur px-3 py-1 text-xs text-white/80 mb-6">
              <Sparkles className="h-3.5 w-3.5" /> Powered by AI 
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight">
              Automate Receipts Extraction with AI
            </h1>
            <p className="mt-6 text-lg md:text-xl text-white/75 max-w-2xl leading-relaxed">
              Upload a receipt. Let AI extract the details. Review, edit, and submit in
              seconds. Built for TP Malaysia.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/app">
                <Button size="lg" className="bg-primary hover:bg-primary/90 h-12 px-6 text-base">
                  Start Now <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <a href="#how">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-6 text-base bg-transparent text-white border-white/30 hover:bg-white/10 hover:text-white"
                >
                  See How It Works
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 md:py-28 bg-background">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-14">
            <p className="text-sm font-medium text-primary uppercase tracking-wider">Features</p>
            <h2 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">
              Smart, fast, multilingual
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: ScanLine,
                title: "AI Receipt Extraction",
                desc: "Upload any receipt. AI reads merchant, date, amount, and currency instantly.",
              },
              {
                icon: Languages,
                title: "Multilingual Support",
                desc: "Handles receipts in all kind of languages — perfect for TP Malaysia's diverse operations.",
              },
              {
                icon: BarChart3,
                title: "Expense Analytics",
                desc: "Track submissions, categories, and totals in a live dashboard with CSV export.",
              },
            ].map((f) => (
              <Card key={f.title} className="p-7 border-border/70 hover:shadow-lg transition-shadow">
                <div className="h-11 w-11 rounded-xl bg-accent text-primary flex items-center justify-center mb-5">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold tracking-tight">{f.title}</h3>
                <p className="mt-2 text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 md:py-28 bg-muted/50 border-y">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-14">
            <p className="text-sm font-medium text-primary uppercase tracking-wider">How it works</p>
            <h2 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">Three simple steps</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 relative">
            {[
              { icon: Upload, title: "Upload Receipt", desc: "Drag and drop your receipt image." },
              { icon: Sparkles, title: "AI Extracts & Auto-fills Form", desc: "Fields populate with confidence scores." },
              { icon: CheckCircle2, title: "Review, Edit & Submit", desc: "Verify, adjust, and submit in seconds." },
            ].map((s, i) => (
              <div key={s.title} className="relative">
                <Card className="p-7 bg-background">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                      {i + 1}
                    </div>
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight">{s.title}</h3>
                  <p className="mt-2 text-muted-foreground text-sm">{s.desc}</p>
                </Card>
              </div>
            ))}
          </div>
          <div className="mt-12 flex justify-center">
            <Link to="/app">
              <Button size="lg" className="h-12 px-6">
                Start Now <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy text-navy-foreground mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <span className="text-primary-foreground text-xl font-extrabold">TP</span>
            <span className="text-white/90 text-xl font-semibold">SmartReceipt</span>
          </div>
          <p className="text-sm text-white/60">
            © 2025 TP Malaysia · Innovation Team · AI Intern Assessment Project
          </p>
        </div>
      </footer>
    </div>
  );
}
