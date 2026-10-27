"use client";

import { ArrowRight, ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { handleAction } from "@/lib/mock-api";

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

export function FinalCta() {
  return (
    <section
      id="book"
      aria-labelledby="book-heading"
      className="scroll-mt-20 px-5 pb-20 sm:px-6 lg:px-8 lg:pb-28"
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="rounded-[28px] bg-brand px-6 py-12 shadow-[0_35px_90px_-55px_rgba(74,28,58,0.75)] sm:px-10 sm:py-14 lg:px-16 lg:py-16">
          <div className="flex flex-col gap-9 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
            <div className="max-w-xl">
              <p className="flex items-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">
                <span
                  className="h-px w-6 bg-white/35"
                  aria-hidden="true"
                />
                Ready when you are
              </p>
              <h2
                id="book-heading"
                className="mt-5 text-[2rem] font-semibold leading-[1.08] tracking-[-0.035em] text-white sm:text-[2.6rem] lg:text-[2.9rem]"
              >
                Give every conversation an owner.
              </h2>
              <p className="mt-4 max-w-md text-[13.5px] leading-6 text-white/65">
                Walk through the full loop — query, action, escalation, and the
                audit trail behind it. We&apos;ll map it to your support
                workflows.
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Button
                onClick={() => handleAction("Book a Demo — final CTA")}
                className="h-12 rounded-lg bg-white px-6 text-sm font-medium text-brand shadow-sm transition-colors hover:bg-[#f6eef3]"
              >
                Book a Demo
                <ArrowUpRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  handleAction("View Architecture — final CTA");
                  scrollToSection("technology");
                }}
                className="h-12 rounded-lg border-white/25 bg-transparent px-6 text-sm font-medium text-white hover:bg-white/10 hover:text-white"
              >
                View Architecture
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/15 pt-5 text-[10.5px] text-white/45">
            <span>30-minute walkthrough</span>
            <span className="hidden size-1 rounded-full bg-white/25 sm:block" />
            <span>No integration required</span>
            <span className="hidden size-1 rounded-full bg-white/25 sm:block" />
            <span>Human-in-the-loop from day one</span>
          </div>
        </div>
      </div>
    </section>
  );
}
