import { ArrowUpRight } from "lucide-react";

import { Logo } from "@/components/site/logo";
import { footerLinks } from "@/lib/data";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto max-w-[1200px] px-5 py-12 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid gap-10 md:grid-cols-[1.15fr_0.9fr_0.95fr] md:gap-8">
          <div>
            <Logo />
            <p className="mt-4 max-w-[16.5rem] text-[13px] leading-6 text-subtle">
              Accountable AI support for teams that own the outcome — not just
              the ticket queue.
            </p>
          </div>

          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
              Quick Links
            </h3>
            <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-[12.5px] text-subtle transition-colors hover:text-ink"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:text-right">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
              Copyright
            </h3>
            <p className="mt-4 text-[12.5px] leading-6 text-subtle">
              © 2026 SupportSage AI.
              <br />
              All rights reserved.
            </p>
            <div className="mt-4 flex items-center gap-2 md:justify-end">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-[10px] font-medium text-subtle">
                <span
                  className="size-1.5 rounded-full bg-brand"
                  aria-hidden="true"
                />
                All systems operational
              </span>
            </div>
            <a
              href="#top"
              className="mt-4 inline-flex items-center gap-1 text-[11px] font-medium text-subtle transition-colors hover:text-ink"
            >
              Back to top
              <ArrowUpRight className="size-3" />
            </a>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-line pt-5 text-[10.5px] text-gray-400 sm:flex-row sm:items-center sm:justify-between">
          <p>Built for support teams that measure outcomes.</p>
          <p className="font-mono uppercase tracking-[0.14em]">
            Chat · Voice · Action · Audit
          </p>
        </div>
      </div>
    </footer>
  );
}
