import { SectionHeading } from "@/components/site/section-heading";
import { metrics } from "@/lib/data";

export function Metrics() {
  return (
    <section
      id="metrics"
      aria-labelledby="metrics-heading"
      className="scroll-mt-20 border-t border-line"
    >
      <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-6 lg:px-8 lg:py-28">
        <SectionHeading
          id="metrics-heading"
          eyebrow="Metrics & Impact"
          title={
            <>
              Driving down operating costs while{" "}
              <span className="text-brand">recapturing revenue.</span>
            </>
          }
          description="Measured across pilot deployments — not projections stitched together in a deck."
        />

        <div className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:mt-16 lg:grid-cols-4">
          {metrics.map((metric, index) => (
            <div
              key={metric.label}
              className="group bg-white p-6 transition-colors duration-300 hover:bg-canvas sm:p-7 lg:p-8"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="font-mono text-[10px] tracking-[0.16em] text-gray-300">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  className="h-px w-6 bg-brand/30 transition-colors duration-300 group-hover:bg-brand"
                  aria-hidden="true"
                />
              </div>

              <p className="mt-8 text-[2.6rem] font-semibold leading-none tracking-[-0.05em] text-brand sm:text-5xl lg:text-[3.4rem]">
                {metric.value}
              </p>
              <p className="mt-4 text-[13px] font-semibold tracking-tight text-ink">
                {metric.label}
              </p>
              <p className="mt-1.5 text-[11.5px] leading-5 text-subtle">
                {metric.detail}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-5 flex items-center gap-2 text-[11px] text-subtle">
          <span className="h-px w-6 bg-line" aria-hidden="true" />
          Impact ranges based on pilot deployments and customer-reported
          outcomes.
        </p>
      </div>
    </section>
  );
}
