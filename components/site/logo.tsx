import { cn } from "cn";

type LogoProps = {
  className?: string;
  markClassName?: string;
  href?: string;
};

export function Logo({ className, markClassName, href = "#top" }: LogoProps) {
  return (
    <a
      href={href}
      aria-label="SupportSage AI"
      className={cn(
        "group inline-flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-[10px] bg-brand text-white shadow-sm ring-1 ring-black/5 transition-transform duration-300 group-hover:rotate-6",
          markClassName,
        )}
      >
        <svg
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
          className="size-[18px]"
        >
          <path
            d="M9.6 1.8c.36 4.12 2.18 5.94 6.3 6.3-4.12.36-5.94 2.18-6.3 6.3-.36-4.12-2.18-5.94-6.3-6.3 4.12-.36 5.94-2.18 6.3-6.3Z"
            fill="currentColor"
          />
          <circle cx="15.9" cy="15.6" r="1.9" fill="currentColor" />
        </svg>
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-ink">
        SupportSage{" "}
        <span className="font-normal text-subtle transition-colors group-hover:text-ink">
          AI
        </span>
      </span>
    </a>
  );
}
