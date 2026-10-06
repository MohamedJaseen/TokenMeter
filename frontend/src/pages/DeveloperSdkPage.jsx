import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Code2, Database, FileCode2, GitBranch, Menu, Sparkles, X } from "lucide-react";

export default function DeveloperSdkPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[#090e18] text-[#eef3ff]">
      <header className="border-b border-[#1d2b42] bg-[#090e18]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#2d2a18] p-2 text-[#f0c82d]">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight text-[#f7f6ee]">TokenMeter</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#7f8eac]">Developer SDK</p>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-[#c8d3e6] md:flex">
            <Link to="/" className="transition hover:text-[#f0c82d]">Home</Link>
            <Link to="/playground" className="transition hover:text-[#f0c82d]">Playground</Link>
            <Link to="/dashboard" className="transition hover:text-[#f0c82d]">Dashboard</Link>
            <Link to="/docs" className="transition hover:text-[#f0c82d]">Docs</Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link to="/playground" className="hidden items-center gap-2 rounded-lg bg-[#d6b65e] px-4 py-2.5 text-xs font-semibold text-[#0d1421] transition hover:bg-[#e7c86d] sm:inline-flex">
              Open playground <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#31415d] text-[#e8eefb] md:hidden" aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
              {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {menuOpen && <nav aria-label="Mobile navigation" className="grid gap-1 border-t border-[#1d2b42] px-4 py-3 md:hidden">
          {[["Home", "/"], ["Playground", "/playground"], ["Dashboard", "/dashboard"], ["Docs", "/docs"]].map(([label, to]) => (
            <Link key={to} to={to} onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-[#c8d3e6] hover:bg-[#151f2b] hover:text-white">{label}</Link>
          ))}
        </nav>}
      </header>

      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d9b93a]">Python SDK</p>
          <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight text-[#f8f3d8]">Build AI products with usage metering in minutes.</h1>
          <p className="mt-4 text-base leading-7 text-[#aab7cc]">
            TokenMeter lets you capture prompts, model output, token usage, quota limits, and real-time billing metrics from the same Python client that powers your AI application.
          </p>
        </div>

        <section className="rounded-3xl border border-[#2c3d57] bg-[#101827] p-5 md:p-7">
          <div className="flex items-center gap-3 border-b border-[#243249] pb-4">
            <div className="rounded-lg bg-[#2d2a18] p-2.5 text-[#f0c82d]">
              <Code2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#edf3ff]">Install the client</p>
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#8ea0ba]">Python package</p>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-[#253249] bg-[#0d1523]">
            <pre className="overflow-x-auto p-5 text-sm leading-7 text-[#dfe9f8]">{`pip install tokenmeter`}</pre>
          </div>

          <div className="mt-8 overflow-hidden rounded-2xl border border-[#253249] bg-[#0d1523]">
            <pre className="overflow-x-auto p-5 text-sm leading-7 text-[#dfe9f8]">{`from tokenmeter import TokenMeter

client = TokenMeter(api_key="YOUR_API_KEY")

response = client.generate(
    prompt="Explain quantum computing",
    model="gemini-2.0-flash",
)

print(response.text)
print(response.total_tokens)
print(response.estimated_cost)
`}</pre>
          </div>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[#253249] bg-[#101827] p-5">
            <div className="mb-4 inline-flex rounded-xl bg-[#1d2a3f] p-2.5 text-[#e0b91c]">
              <FileCode2 className="h-4 w-4" />
            </div>
            <p className="text-base font-semibold text-[#ebf1ff]">Prompt + model input</p>
            <p className="mt-3 text-sm leading-6 text-[#a8b7cf]">Record the exact model configuration and prompt payload for every AI request.</p>
          </div>
          <div className="rounded-2xl border border-[#253249] bg-[#101827] p-5">
            <div className="mb-4 inline-flex rounded-xl bg-[#1d2a3f] p-2.5 text-[#e0b91c]">
              <Database className="h-4 w-4" />
            </div>
            <p className="text-base font-semibold text-[#ebf1ff]">Usage metadata capture</p>
            <p className="mt-3 text-sm leading-6 text-[#a8b7cf]">Collect input, output, total tokens, and response payload information automatically.</p>
          </div>
          <div className="rounded-2xl border border-[#253249] bg-[#101827] p-5">
            <div className="mb-4 inline-flex rounded-xl bg-[#1d2a3f] p-2.5 text-[#e0b91c]">
              <GitBranch className="h-4 w-4" />
            </div>
            <p className="text-base font-semibold text-[#ebf1ff]">Quota and billing hooks</p>
            <p className="mt-3 text-sm leading-6 text-[#a8b7cf]">Push meter events into the metering pipeline and surface them in quotas, invoices, and dashboards.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
