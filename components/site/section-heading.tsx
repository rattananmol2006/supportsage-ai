import type { ReactNode } from "react";
import { cn } from "cn";

type SectionHeadingProps = {
  id?: string;
  eyebrow: string;
  title: ReactNode;
  description?: string;
  className?: string;
  titleClassName?: string;
};

export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  className,
  titleClassName,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-16",
        className,
      )}
    >
      <div className="max-w-2xl">
        <div className="flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.2em] text-subtle">
          <span className="h-px w-6 bg-brand" aria-hidden="true" />
          {eyebrow}
        </div>
        <h2
          id={id}
          className={cn(
            "mt-5 text-[2rem] font-semibold leading-[1.1] tracking-[-0.035em] text-ink sm:text-[2.6rem] lg:text-[2.9rem]",
            titleClassName,
          )}
        >
          {title}
        </h2>
      </div>
      {description ? (
        <p className="max-w-md text-[15px] leading-7 text-subtle lg:pb-1.5">
          {description}
        </p>
      ) : null}
    </div>
  );
}
