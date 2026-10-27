"use client";

import { useEffect, useState } from "react";
import {
  Check,
  CircleCheck,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { SectionHeading } from "@/components/site/section-heading";
import { pipelineSteps } from "@/lib/data";

const AUTO_ADVANCE_MS = 2600;

const stageMeta = [
  ["Chat + voice", "Identity resolved"],
  ["3 sources", "Permissioned"],
  ["Action API", "Draft ready"],
  ["96%", "Above threshold"],
  ["Trace #8421", "1.8s total"],
];

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
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const lastStep = pipelineSteps.length - 1;
  const ActiveIcon = pipelineSteps[activeStep].icon;

  useEffect(() => {
    if (!isPlaying || activeStep >= lastStep) return;

    const timer = window.setTimeout(() => {
      setActiveStep((current) => Math.min(current + 1, lastStep));
    }, AUTO_ADVANCE_MS);

    return () => window.clearTimeout(timer);
  }, [activeStep, isPlaying, lastStep]);

  const selectStep = (index: number) => {
    setActiveStep(index);
    setIsPlaying(false);
  };

  const replay = () => {
    setActiveStep(0);
    setIsPlaying(true);
  };

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
              <div className="rounded-[28px] border border-line bg-white/60 p-4 shadow-[0_30px_70px_-55px_rgba(26,26,26,0.45)] sm:p-5">
                <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
                  <div>
                    <p className="flex items-center gap-2 text-[9.5px] font-semibold uppercase tracking-[0.18em] text-subtle">
                      <span
                        className={`size-1.5 rounded-full bg-brand ${
                          isPlaying ? "animate-pulse" : ""
                        }`}
                        aria-hidden="true"
                      />
                      Interactive flow
                    </p>
                    <h3 className="mt-2 text-[15px] font-semibold tracking-tight text-ink">
                      Message to resolution
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={replay}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[10px] font-medium text-subtle shadow-[0_1px_2px_rgba(16,24,40,0.03)] transition-colors hover:border-brand/25 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
                    aria-label="Replay the pipeline animation from stage one"
                  >
                    <RotateCcw className="size-3" strokeWidth={1.9} />
                    Replay
                  </button>
                </div>

                <ol className="relative mt-3" aria-label="Execution pipeline stages">
                  <span
                    className="pointer-events-none absolute bottom-6 left-[23px] top-6 w-px bg-line"
                    aria-hidden="true"
                  >
                    <span
                      className="block w-px bg-brand transition-[height] duration-500 ease-out"
                      style={{
                        height: `${(activeStep / lastStep) * 100}%`,
                      }}
                    />
                  </span>

                  {pipelineSteps.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = index === activeStep;
                    const isComplete = index < activeStep;
                    const isPending = index > activeStep;
                    const isFinal = isActive && index === lastStep;

                    return (
                      <li key={step.number}>
                        <button
                          type="button"
                          onClick={() => selectStep(index)}
                          aria-current={isActive ? "step" : undefined}
                          aria-label={`Inspect stage ${step.number}: ${step.title}`}
                          className={`group relative grid w-full grid-cols-[32px_1fr] items-start gap-3 rounded-xl px-2 py-2 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 ${
                            isActive ? "bg-brand/[0.035]" : "hover:bg-canvas"
                          }`}
                        >
                          <span
                            className={`relative z-10 flex size-8 items-center justify-center rounded-full border transition-all duration-300 ${
                              isActive
                                ? "border-brand bg-brand text-white shadow-[0_6px_16px_-8px_rgba(74,28,58,0.8)] ring-4 ring-brand/10"
                                : isComplete
                                  ? "border-brand/20 bg-[#f6eef3] text-brand"
                                  : "border-line bg-white text-gray-300 group-hover:border-brand/30 group-hover:text-brand"
                            }`}
                          >
                            {isComplete ? (
                              <Check className="size-3.5" strokeWidth={2.2} />
                            ) : (
                              <Icon className="size-3.5" strokeWidth={1.8} />
                            )}
                          </span>

                          <span className="min-w-0 pt-0.5">
                            <span className="flex items-center gap-2">
                              <span className="font-mono text-[9.5px] tracking-[0.12em] text-subtle">
                                {step.number}
                              </span>
                              <span
                                className={`truncate text-[12.5px] font-semibold tracking-tight ${
                                  isPending ? "text-subtle" : "text-ink"
                                }`}
                              >
                                {step.title}
                              </span>

                              {isActive ? (
                                <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-brand/15 bg-brand/[0.05] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-brand">
                                  <span
                                    className="size-1 rounded-full bg-brand"
                                    aria-hidden="true"
                                  />
                                  {isFinal ? "Done" : isPlaying ? "Live" : "Selected"}
                                </span>
                              ) : isComplete ? (
                                <span className="ml-auto shrink-0 text-[8.5px] font-medium uppercase tracking-[0.12em] text-brand/60">
                                  Done
                                </span>
                              ) : (
                                <span className="ml-auto shrink-0 text-[8.5px] font-medium uppercase tracking-[0.12em] text-gray-400">
                                  Queued
                                </span>
                              )}
                            </span>
                            <span className="mt-1 block truncate text-[10px] leading-4 text-subtle">
                              {isActive
                                ? isFinal
                                  ? "Closed loop · written to audit"
                                  : isPlaying
                                    ? "Processing with full context"
                                    : "Paused for inspection"
                                : isComplete
                                  ? "Stage complete"
                                  : "Waiting on upstream"}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>

                <div
                  className="mt-3 rounded-2xl border border-line bg-canvas p-4"
                  role="region"
                  aria-label={`Stage ${pipelineSteps[activeStep].number} details`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-white">
                      <ActiveIcon className="size-4" strokeWidth={1.8} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-subtle">
                        Stage {pipelineSteps[activeStep].number}
                      </p>
                      <p className="truncate text-[12.5px] font-semibold tracking-tight text-ink">
                        {pipelineSteps[activeStep].title}
                      </p>
                    </div>
                    <span className="ml-auto shrink-0 rounded-full border border-line bg-white px-2 py-1 text-[8.5px] font-medium uppercase tracking-[0.12em] text-subtle">
                      {activeStep === lastStep
                        ? "Resolved"
                        : isPlaying
                          ? "Auto"
                          : "Selected"}
                    </span>
                  </div>

                  <p className="mt-3 text-[11.5px] leading-5 text-subtle">
                    {pipelineSteps[activeStep].description}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {stageMeta[activeStep].map((meta) => (
                      <span
                        key={meta}
                        className="rounded-md border border-line bg-white px-2 py-1 text-[9.5px] font-medium text-subtle"
                      >
                        {meta}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <p className="mt-4 flex items-center justify-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-subtle">
                <span
                  className="size-1.5 rounded-full bg-brand"
                  aria-hidden="true"
                />
                Interactive pipeline · click any stage
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
