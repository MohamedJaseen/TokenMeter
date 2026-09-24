import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  Database,
  FileCode2,
  Gauge,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

const metrics = [
  { label: "Tokens metered", value: "24.6M", detail: "this month" },
  { label: "API calls", value: "1.4M", detail: "processed" },
  { label: "Quota in use", value: "68%", detail: "under budget" },
];

const steps = [
  { title: "Prompt", detail: "User sends a request from your app or the playground." },
  { title: "SDK / API", detail: "The platform captures metadata, token counts, and usage context." },
  { title: "Metering pipeline", detail: "Redis streams and background workers aggregate events into usage records." },
  { title: "Billing + quota", detail: "Usage is scored against limits and enriched for billing dashboards." },
];

const featureCards = [
  { icon: Gauge, title: "Usage visibility", text: "See token consumption, request volume, and quota thresholds in real time." },
  { icon: ShieldCheck, title: "Quota enforcement", text: "Block or warn when a tenant crosses usage, cost, or rate limits." },
  { icon: CircleDollarSign, title: "Billing intelligence", text: "Turn meter events into precise estimates, invoices, and spend forecasts." },
  { icon: FileCode2, title: "Developer-first SDK", text: "Instrument AI requests in Python with clean, metered call tracking." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#090e18] text-[#eef3ff]">
      <header className="sticky top-0 z-20 border-b border-[#1d2b42] bg-[#090e18]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#2d2a18] p-2 text-[#f0c82d]">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight text-[#f7f6ee]">TokenMeter</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#7f8eac]">AI metering</p>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-[#c8d3e6] md:flex">
            <Link to="/playground" className="transition hover:text-[#f0c82d]">Playground</Link>
            <Link to="/dashboard" className="transition hover:text-[#f0c82d]">Dashboard</Link>
            <Link to="/developer/sdk" className="transition hover:text-[#f0c82d]">SDK</Link>
            <Link to="/docs" className="transition hover:text-[#f0c82d]">Docs</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden rounded-full border border-[#31415d] px-3 py-2 text-xs font-medium text-[#e8eefb] transition hover:border-[#d1a91c] hover:text-[#f0c82d] sm:inline-flex">Sign in</Link>
            <Link to="/playground" className="inline-flex items-center gap-2 rounded-full bg-[#d1a91c] px-4 py-2 text-xs font-semibold text-[#0d1421] transition hover:bg-[#f0c82d]">
              Try AI Playground <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 lg:px-8 lg:pt-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#2f3a4d] bg-[#111a2b] px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-[#d9b93a]">
                <Zap className="h-3.5 w-3.5" />
                AI usage metering & billing
              </div>

              <h1 className="max-w-xl font-serif text-4xl font-bold tracking-tight text-[#f8f3d8] sm:text-5xl lg:text-6xl">
                Turn every prompt into measurable usage.
              </h1>

              <p className="mt-5 max-w-lg text-base leading-7 text-[#aab7cc]">
                Track AI requests, capture token usage, enforce quotas, and understand cost from the first prompt to the final invoice.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link to="/playground" className="inline-flex items-center gap-2 rounded-full bg-[#d1a91c] px-5 py-3 text-sm font-semibold text-[#0b1220] transition hover:bg-[#f0c82d]">
                  Try the Playground <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-full border border-[#31415d] px-5 py-3 text-sm font-semibold text-[#eaf1ff] transition hover:border-[#d1a91c] hover:text-[#f0c82d]">
                  View dashboard
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-4">
                {metrics.map((stat) => (
                  <div key={stat.label} className="min-w-[140px] rounded-2xl border border-[#253249] bg-[#101827] px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-[#7a8ca3]">{stat.label}</p>
                    <p className="mt-2 font-mono text-xl font-semibold text-[#f5f7fb]">{stat.value}</p>
                    <p className="mt-1 text-[10px] text-[#8ea0ba]">{stat.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-[#2c3c54] bg-[#101827] p-4 shadow-[0_18px_50px_rgba(8,13,23,0.7)]">
              <div className="rounded-2xl border border-[#2d3b54] bg-[#0d1523] p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#edf3ff]">
                    <Bot className="h-4 w-4 text-[#e0b91c]" />
                    AI Playground
                  </div>
                  <span className="rounded-full border border-[#3d4b64] bg-[#151f30] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[#9bb1d4]">Gemini</span>
                </div>

                <div className="rounded-xl border border-[#2c3d57] bg-[#111f33] p-3 text-sm text-[#e5edf9]">
                  <p className="text-[#8ca0bd]">Prompt</p>
                  <p className="mt-2 leading-6">Explain how token metering helps an AI SaaS team control cost before the invoice hits.</p>
                </div>

                <div className="mt-4 rounded-xl border border-[#2c3d57] bg-[#172439] p-3 text-sm text-[#dfe8f7]">
                  <p className="text-[#8ca0bd]">Response</p>
                  <p className="mt-2 leading-6 text-[#ebf2ff]">
                    Token metering turns every request into a clean usage record, so teams can monitor spend, detect anomalies, and enforce limits before overages occur.
                  </p>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-[#121f33] p-2.5 text-center">
                    <p className="text-[9px] uppercase tracking-[0.12em] text-[#7d8ea9]">Tokens</p>
                    <p className="mt-1 font-mono text-base font-semibold text-[#efefef]">1,284</p>
                  </div>
                  <div className="rounded-xl bg-[#121f33] p-2.5 text-center">
                    <p className="text-[9px] uppercase tracking-[0.12em] text-[#7d8ea9]">Cost</p>
                    <p className="mt-1 font-mono text-base font-semibold text-[#efefef]">$0.0128</p>
                  </div>
                  <div className="rounded-xl bg-[#121f33] p-2.5 text-center">
                    <p className="text-[9px] uppercase tracking-[0.12em] text-[#7d8ea9]">Latency</p>
                    <p className="mt-1 font-mono text-base font-semibold text-[#efefef]">1.4s</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#1d2b42] bg-[#0d1523]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="mb-8 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d9b93a]">AI Playground</p>
              <h2 className="mt-3 text-3xl font-bold text-[#f2f5fb]">Prompt → response → metered usage.</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                ["Model", "Gemini 2.0 Flash"],
                ["Prompt length", "2,846 chars"],
                ["Output tokens", "894"],
                ["Estimated cost", "$0.0128"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-[#253249] bg-[#101827] p-4">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-[#7d8ea9]">{label}</p>
                  <p className="mt-3 font-mono text-lg font-semibold text-[#f5f7fb]">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d9b93a]">Real-time usage</p>
            <h2 className="mt-3 text-3xl font-bold text-[#f2f5fb]">Operational visibility across every AI integration.</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-[#253249] bg-[#101827] p-6">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#8fa4c5]">Token usage</p>
                <BarChart3 className="h-4 w-4 text-[#d1a91c]" />
              </div>
              <p className="mt-5 font-serif text-4xl font-bold text-[#f8f3d8]">1.2M</p>
              <p className="mt-3 text-sm text-[#a4b4cd]">Tokens processed in the last 24 hours.</p>
            </div>
            <div className="rounded-3xl border border-[#253249] bg-[#101827] p-6">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#8fa4c5]">Quota</p>
                <Gauge className="h-4 w-4 text-[#52b89b]" />
              </div>
              <p className="mt-5 font-serif text-4xl font-bold text-[#f8f3d8]">68%</p>
              <p className="mt-3 text-sm text-[#a4b4cd]">Monthly allowance consumed across the tenant.</p>
            </div>
            <div className="rounded-3xl border border-[#253249] bg-[#101827] p-6">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#8fa4c5]">Estimated spend</p>
                <CircleDollarSign className="h-4 w-4 text-[#d8ad32]" />
              </div>
              <p className="mt-5 font-serif text-4xl font-bold text-[#f8f3d8]">$4,220</p>
              <p className="mt-3 text-sm text-[#a4b4cd]">Forecasted this billing cycle with current usage trend.</p>
            </div>
          </div>
        </section>

        <section className="border-y border-[#1d2b42] bg-[#0b1220]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="mb-8 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d9b93a]">How it works</p>
              <h2 className="mt-3 text-3xl font-bold text-[#f2f5fb]">Implement metering once, then monitor everything.</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              {steps.map((step, index) => (
                <div key={step.title} className="rounded-2xl border border-[#253249] bg-[#101827] p-5">
                  <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#2d2a18] text-xs font-bold text-[#f0c82d]">{index + 1}</div>
                  <p className="text-sm font-semibold text-[#edf4ff]">{step.title}</p>
                  <p className="mt-3 text-sm leading-6 text-[#a8b7cf]">{step.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-[#2c3d57] bg-[#101827] p-6 md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d9b93a]">Developer SDK</p>
                <h2 className="mt-3 text-3xl font-bold text-[#f2f5fb]">Build with TokenMeter.</h2>
                <p className="mt-3 text-base leading-7 text-[#a9b8ce]">
                  Integrate AI usage tracking into your application with a simple Python interface designed for prompt-driven workflows.
                </p>
              </div>

              <Link to="/developer/sdk" className="inline-flex items-center justify-center rounded-full bg-[#d1a91c] px-5 py-3 text-sm font-semibold text-[#0b1220] transition hover:bg-[#f0c82d]">
                Read SDK docs
              </Link>
            </div>

            <div className="mt-8 overflow-hidden rounded-2xl border border-[#253249] bg-[#0d1523]">
              <pre className="overflow-x-auto p-5 text-sm leading-7 text-[#dfe9f8]">
{`pip install tokenmeter

from tokenmeter import TokenMeter

client = TokenMeter(api_key="YOUR_API_KEY")

response = client.generate(
    prompt="Explain quantum computing",
)`}
              </pre>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d9b93a]">Features</p>
            <h2 className="mt-3 text-3xl font-bold text-[#f2f5fb]">Everything a metered AI platform needs.</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {featureCards.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-3xl border border-[#253249] bg-[#101827] p-5">
                <div className="mb-4 inline-flex rounded-xl bg-[#1d2a3f] p-2.5 text-[#e0b91c]">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-base font-semibold text-[#ebf1ff]">{title}</p>
                <p className="mt-3 text-sm leading-6 text-[#a8b7cf]">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-[#1d2b42] bg-[#0b1220]">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-8 text-sm text-[#8ea0ba] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#2d2a18] p-2 text-[#f0c82d]">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-medium text-[#edf4ff]">TokenMeter</span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <Link to="/playground" className="transition hover:text-[#f0c82d]">AI Playground</Link>
            <Link to="/dashboard" className="transition hover:text-[#f0c82d]">Dashboard</Link>
            <Link to="/developer/sdk" className="transition hover:text-[#f0c82d]">Python SDK</Link>
            <Link to="/login" className="transition hover:text-[#f0c82d]">Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
