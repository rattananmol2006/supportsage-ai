"use client";

import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Gauge,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { metrics } from "@/lib/data";
import { handleAction } from "@/lib/mock-api";

const heroMetrics = metrics.filter((metric) => metric.value.endsWith("%"));

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

export function Hero() {
  return (
    <section id="top" aria-labelledby="hero-heading" className="relative">
      <div className="mx-auto grid max-w-[1200px] items-center gap-16 px-5 pb-16 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)] lg:gap-8 lg:px-8 lg:pb-24 lg:pt-20">
        <div className="animate-rise max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
            <span className="size-1.5 rounded-full bg-brand" aria-hidden="true" />
            Accountable AI Support
          </p>

          <h1
            id="hero-heading"
            className="mt-7 text-[2.7rem] font-semibold leading-[1.03] tracking-[-0.05em] text-ink sm:text-6xl lg:text-[4.2rem]"
          >
            Built to act, escalate, and{" "}
            <span className="text-brand">account for itself.</span>
          </h1>

          <p className="mt-6 max-w-[34rem] text-[15px] leading-7 text-subtle sm:text-[17px] sm:leading-8">
            Unified chat and voice AI that acts, escalates with full context,
            and provides a complete audit trail. Recapture revenue lost to
            unanswered inquiries.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              onClick={() => {
                handleAction("See it in Action — hero");
                scrollToSection("pipeline");
              }}
              className="h-12 rounded-lg bg-brand px-6 text-sm font-medium text-white shadow-[0_8px_20px_-10px_rgba(74,28,58,0.65)] transition-colors hover:bg-brand-deep"
            >
              See it in Action
              <ArrowUpRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                handleAction("View Architecture — hero");
                scrollToSection("technology");
              }}
              className="h-12 rounded-lg border-line bg-white px-6 text-sm font-medium text-ink shadow-[0_1px_2px_rgba(16,24,40,0.03)] hover:bg-gray-50"
            >
              View Architecture
              <ArrowRight className="size-4 text-subtle" />
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-[12px] text-subtle">
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-3.5 text-brand" aria-hidden="true" />
              Human-in-the-loop by design
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-3.5 text-brand" aria-hidden="true" />
              Full trace on every answer
            </span>
          </div>
        </div>

        <div className="animate-rise animate-rise-delay relative mx-auto w-full max-w-[560px]">
          <div className="rounded-[28px] border border-line bg-white/60 p-4 shadow-[0_30px_70px_-55px_rgba(26,26,26,0.45)] sm:p-5">
            <div className="grid items-stretch gap-3 sm:grid-cols-[1fr_auto_1fr] lg:grid-cols-1 xl:grid-cols-[1fr_auto_1fr]">
              <article className="flex h-full flex-col rounded-2xl border border-line bg-white p-4 shadow-[0_12px_35px_-24px_rgba(26,26,26,0.35)]">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand/[0.06] text-brand">
                    <MessageSquareText
                      className="size-3.5"
                      strokeWidth={1.8}
                    />
                  </span>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle">
                    Live Conversation
                  </p>
                  <span
                    className="ml-auto size-1.5 rounded-full bg-brand"
                    aria-hidden="true"
                  />
                </div>

                <div className="mt-4 flex flex-1 flex-col gap-2">
                  <p className="max-w-[92%] rounded-xl rounded-tl-sm border border-line bg-canvas px-3 py-2 text-[11.5px] leading-5 text-ink">
                    Where is my order #1042?
                  </p>
                  <p className="ml-auto max-w-[94%] rounded-xl rounded-tr-sm bg-brand px-3 py-2 text-[11.5px] leading-5 text-white">
                    Retrieved order context. Processing refund request…
                  </p>
                  <p className="max-w-[45%] rounded-xl rounded-tl-sm border border-line bg-canvas px-3 py-2 text-[11.5px] leading-5 text-ink">
                    Thanks!
                  </p>
                </div>
              </article>

              <div className="flex items-center justify-center py-0.5">
                <span
                  className="hidden h-px w-2 bg-line sm:block lg:hidden xl:block"
                  aria-hidden="true"
                />
                <span className="flex size-7 items-center justify-center rounded-full border border-line bg-white text-subtle shadow-sm">
                  <ArrowRight
                    className="size-3.5 rotate-90 sm:rotate-0 lg:rotate-90 xl:rotate-0"
                    strokeWidth={1.8}
                  />
                </span>
                <span
                  className="hidden h-px w-2 bg-line sm:block lg:hidden xl:block"
                  aria-hidden="true"
                />
              </div>

              <article className="flex h-full flex-col rounded-2xl border border-line bg-white p-4 shadow-[0_12px_35px_-24px_rgba(26,26,26,0.35)]">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand/[0.06] text-brand">
                    <Gauge className="size-3.5" strokeWidth={1.8} />
                  </span>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle">
                    Owner Dashboard
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  {heroMetrics.map((metric) => (
                    <div key={metric.label}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[10.5px] leading-4 text-subtle">
                          {metric.heroLabel ?? metric.label}
                        </span>
                        <span className="font-mono text-[9.5px] font-medium text-ink">
                          {metric.value}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{ width: metric.value }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-3">
                  <div className="rounded-lg border border-brand/10 bg-brand/[0.05] px-2.5 py-2">
                    <div className="flex items-start gap-1.5">
                      <ShieldCheck
                        className="mt-0.5 size-3 shrink-0 text-brand"
                        strokeWidth={1.8}
                      />
                      <p className="text-[9.5px] leading-4 text-brand">
                        <span className="font-semibold">Audit log:</span> query
                        → context → response
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>

          <p className="mt-4 flex items-center justify-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-subtle">
            <span className="size-1.5 rounded-full bg-brand" aria-hidden="true" />
            Live conversation · owner-ready metrics
          </p>
        </div>
      </div>
    </section>
  );
}
