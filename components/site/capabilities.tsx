import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/site/section-heading";
import { capabilities } from "@/lib/data";

export function Capabilities() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="scroll-mt-20 border-t border-line"
    >
      <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-6 lg:px-8 lg:py-28">
        <SectionHeading
          id="features-heading"
          eyebrow="Core Capabilities"
          title="One system for every support conversation."
          description="Chat, voice, actions, and accountability share one context engine — so nothing gets lost between tools."
        />

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:mt-16 lg:grid-cols-3">
          {capabilities.map((capability, index) => {
            const Icon = capability.icon;

            return (
              <Card
                key={capability.title}
                className="group relative gap-0 rounded-2xl border border-line bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.03)] ring-0 transition-all duration-300 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-[0_18px_40px_-26px_rgba(26,26,26,0.28)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-brand/[0.06] text-brand ring-1 ring-inset ring-brand/10 transition-colors duration-300 group-hover:bg-brand/[0.09]">
                    <Icon className="size-[18px]" strokeWidth={1.8} />
                  </span>
                  <span className="font-mono text-[10px] tracking-[0.16em] text-gray-300">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <h3 className="mt-6 text-[15px] font-semibold tracking-tight text-ink">
                  {capability.title}
                </h3>
                <p className="mt-2.5 text-[13.5px] leading-6 text-subtle">
                  {capability.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
