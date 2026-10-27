"use client";

import {
  CircleCheck,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { SectionHeading } from "@/components/site/section-heading";
import TiltCard from "@/components/ui/3d-tilt-card";
import { pipelineSteps } from "@/lib/data";

const traceRows = [
  {
    label: "Retrieved context",
    time: "0.4s",
    content: (
      <div className="flex flex-wrap gap-1.5">
        {["Order #1042", "Payments API", "Refund policy v3"].map((item) => (
          <span
            key={item}
            className="rounded-md border border-line bg-canvas px-2 py-1 text-[11px] font-medium text-subtle"
          >
            {item}
          </span>
        ))}
      </div>
    ),
  },
  {
    label: "Action taken",
    time: "1.1s",
    content: (
      <span className="inline-flex items-center gap-1.5 font-medium">
        <CircleCheck className="size-3.5 text-brand" strokeWidth={1.9} />
        Duplicate charge refunded · $84.00
      </span>
    ),
  },
  {
    label: "Audit record",
    time: "1.8s",
    content: (
      <span className="text-subtle">
        Query, sources, action, and final response stored.
      </span>
    ),
  },
];

export function Pipeline() {
  return (
    <section
      id="pipeline"
      aria-labelledby="pipeline-heading"
      className="scroll-mt-20 border-t border-line"
    >
      <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-6 lg:px-8 lg:py-28">
        <SectionHeading
          id="pipeline-heading"
          eyebrow="Execution Pipeline"
          title="From message to resolution in one flow."
          description="Five transparent stages from first contact to closed loop. Every step is observable, permissioned, and written to the record."
        />

        <ol className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:mt-16 lg:grid-cols-5">
          {pipelineSteps.map((step, index) => {
            const Icon = step.icon;

            return (
              <li
                key={step.number}
                className={`group bg-white p-6 transition-colors duration-300 hover:bg-canvas ${
                  index === pipelineSteps.length - 1
                    ? "sm:col-span-2 lg:col-span-1"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-mono text-[11px] font-medium tracking-[0.12em] text-brand">
                    {step.number}
                  </span>
                  <Icon
                    className="size-4 text-gray-300 transition-colors duration-300 group-hover:text-brand"
                    strokeWidth={1.7}
                  />
                </div>
                <h3 className="mt-8 text-[13.5px] font-semibold tracking-tight text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-[12.5px] leading-[1.65] text-subtle">
                  {step.description}
                </p>
              </li>
            );
          })}
        </ol>

        <div className="mt-14 grid items-center gap-12 lg:mt-20 lg:grid-cols-2 lg:gap-16">
          <div className="order-2 lg:order-1">
            <div className="relative mx-auto w-full max-w-[460px]">
              <div className="rounded-[28px] border border-line bg-white/60 px-1 py-6 sm:px-3 sm:py-8">
                <div className="tilt-fit">
                  <TiltCard />
                </div>

                <div className="pointer-events-none absolute bottom-10 left-2 z-20 hidden items-center gap-2 rounded-full border border-line bg-white/95 py-2 pl-2 pr-3.5 shadow-[0_12px_35px_-16px_rgba(26,26,26,0.3)] backdrop-blur-sm sm:flex">
                  <span className="flex size-6 items-center justify-center rounded-full bg-brand/[0.07] text-brand">
                    <LockKeyhole className="size-3.5" strokeWidth={1.9} />
                  </span>
                  <span className="text-[11px] font-medium text-ink">
                    Audited end-to-end
                  </span>
                </div>
              </div>

              <p className="mt-4 flex items-center justify-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-subtle">
                <span
                  className="size-1.5 rounded-full bg-brand"
                  aria-hidden="true"
                />
                Operator console preview
              </p>
            </div>
          </div>

          <figure className="order-1 lg:order-2">
            <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_30px_80px_-48px_rgba(26,26,26,0.4)]">
              <div className="flex items-center justify-between gap-4 border-b border-line bg-canvas/70 px-4 py-3.5 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex shrink-0 gap-1.5" aria-hidden="true">
                    <span className="size-2 rounded-full bg-gray-200" />
                    <span className="size-2 rounded-full bg-gray-200" />
                    <span className="size-2 rounded-full bg-gray-200" />
                  </div>
                  <span className="h-3.5 w-px bg-line" aria-hidden="true" />
                  <span className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">
                    Trace #8421
                  </span>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-brand/15 bg-brand/[0.05] px-2.5 py-1 text-[9.5px] font-medium uppercase tracking-[0.12em] text-brand">
                  <LockKeyhole className="size-3" strokeWidth={1.9} />
                  Audited
                </span>
              </div>

              <div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-subtle">
                      Customer query
                    </p>
                    <p className="mt-2 max-w-sm text-[13.5px] leading-6 text-ink">
                      &ldquo;I was charged twice for order #1042. Can you refund
                      the duplicate?&rdquo;
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md border border-line px-2 py-1 text-[10px] font-medium text-subtle">
                    Web chat
                  </span>
                </div>

                <div className="mt-5 h-px bg-line" />

                <ol className="mt-5 space-y-4">
                  {traceRows.map((row) => (
                    <li key={row.label} className="grid grid-cols-[14px_1fr] gap-3">
                      <span className="mt-1.5 flex size-3.5 items-center justify-center rounded-full border border-brand/20 bg-brand/[0.06]">
                        <span className="size-1 rounded-full bg-brand" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-subtle">
                            {row.label}
                          </p>
                          <span className="font-mono text-[10px] text-gray-400">
                            {row.time}
                          </span>
                        </div>
                        <div className="mt-1.5 text-[12.5px] leading-5 text-ink">
                          {row.content}
                        </div>
                      </div>
                    </li>
                  ))}

                  <li className="grid grid-cols-[14px_1fr] gap-3">
                    <span className="mt-1.5 flex size-3.5 items-center justify-center rounded-full border border-brand/20 bg-brand/[0.06]">
                      <span className="size-1 rounded-full bg-brand" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-subtle">
                          Confidence gate
                        </p>
                        <span className="font-mono text-[10px] font-medium text-brand">
                          96%
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full w-[96%] rounded-full bg-brand" />
                        </div>
                        <span className="shrink-0 text-[10px] text-subtle">
                          Above threshold
                        </span>
                      </div>
                    </div>
                  </li>
                </ol>

                <div className="mt-5 flex items-center justify-between gap-3 rounded-lg border border-line bg-canvas px-3.5 py-2.5">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink">
                    <span
                      className="size-1.5 rounded-full bg-brand"
                      aria-hidden="true"
                    />
                    Resolved
                  </span>
                  <span className="font-mono text-[10px] text-subtle">
                    1.8s total · no escalation
                  </span>
                </div>
              </div>
            </div>

            <figcaption className="mt-4 flex items-start gap-2 text-[11.5px] leading-5 text-subtle">
              <ShieldCheck
                className="mt-0.5 size-3.5 shrink-0 text-brand"
                strokeWidth={1.8}
              />
              Every retrieval, action, and response is written to an append-only
              audit log.
            </figcaption>
          </figure>
        </div>

        <div className="mt-14 flex items-center justify-center gap-2 text-[11px] text-subtle lg:mt-16">
          <Sparkles className="size-3.5 text-brand" strokeWidth={1.8} />
          The same context follows the customer from AI to human — no repeats.
        </div>
      </div>
    </section>
  );
}
