import { SectionHeading } from "@/components/site/section-heading";
import { techStack } from "@/lib/data";

export function Technology() {
  return (
    <section
      id="technology"
      aria-labelledby="technology-heading"
      className="scroll-mt-20 border-t border-line"
    >
      <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-6 lg:px-8 lg:py-28">
        <SectionHeading
          id="technology-heading"
          eyebrow="Technology Stack"
          title="A stack built for real-time support."
          description="Proven infrastructure at every layer — observable, permissioned, and ready for production traffic."
        />

        <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
          {techStack.map((stack, index) => {
            const Icon = stack.icon;

            return (
              <div
                key={stack.category}
                className="group bg-white p-6 transition-colors duration-300 hover:bg-canvas sm:p-7"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="flex size-9 items-center justify-center rounded-lg border border-line bg-canvas text-brand transition-colors duration-300 group-hover:bg-white">
                    <Icon className="size-4" strokeWidth={1.8} />
                  </span>
                  <span className="font-mono text-[10px] tracking-[0.16em] text-gray-300">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <h3 className="mt-7 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-subtle">
                  {stack.category}
                </h3>

                <ul className="mt-4">
                  {stack.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2.5 border-t border-line/80 py-2.5 text-[13px] font-medium text-ink first:border-t-0"
                    >
                      <span
                        className="size-1 rounded-full bg-brand/40"
                        aria-hidden="true"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col gap-3 text-[11px] text-subtle sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2">
            <span className="h-px w-6 bg-line" aria-hidden="true" />
            Cloud or private VPC deployment.
          </p>
          <p className="font-mono uppercase tracking-[0.14em] text-gray-400">
            Observable by default
          </p>
        </div>
      </div>
    </section>
  );
}
