import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Briefcase, Stethoscope } from "lucide-react";
import { cn } from "cn";

import type { ChatMode, Notification } from "@/lib/types";

export type Tone = "brand" | "green" | "amber" | "red" | "gray" | "blue";

const toneClasses: Record<Tone, string> = {
  brand: "border-brand/15 bg-brand/[0.06] text-brand",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  red: "border-red-200 bg-red-50 text-red-700",
  gray: "border-line bg-canvas text-subtle",
  blue: "border-sky-200 bg-sky-50 text-sky-700",
};

export function Pill({
  children,
  tone = "gray",
  className,
  icon: Icon,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  icon?: LucideIcon;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em]",
        toneClasses[tone],
        className,
      )}
    >
      {Icon ? <Icon className="size-2.5" /> : null}
      {children}
    </span>
  );
}

export function ModePill({
  mode,
  className,
}: {
  mode: ChatMode;
  className?: string;
}) {
  const Icon = mode === "doctor" ? Stethoscope : Briefcase;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-line bg-white px-2 py-0.5 text-[9.5px] font-medium text-subtle",
        className,
      )}
    >
      <Icon className="size-2.5 text-brand" />
      {mode === "doctor" ? "Doctor" : "Business Owner"}
    </span>
  );
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.03)]",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line/80 px-4 py-3.5 sm:px-5">
        <div>
          <h2 className="text-[13px] font-semibold text-ink">{title}</h2>
          {description ? (
            <p className="mt-0.5 max-w-2xl text-[11px] leading-5 text-subtle">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={cn("p-4 sm:p-5", contentClassName)}>{children}</div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "brand",
}: {
  label: string;
  value: number | string;
  detail: string;
  icon: LucideIcon;
  tone?: Tone;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-subtle">
          {label}
        </p>
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-lg border",
            toneClasses[tone],
          )}
        >
          <Icon className="size-3.5" />
        </span>
      </div>
      <p className="mt-2 text-[24px] font-semibold leading-none tracking-tight text-ink">
        {value}
      </p>
      <p className="mt-1.5 text-[10px] leading-4 text-subtle">{detail}</p>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-canvas/60 px-5 py-10 text-center">
      <span className="flex size-10 items-center justify-center rounded-xl border border-line bg-white text-brand">
        <Icon className="size-4.5" />
      </span>
      <p className="mt-3 text-[12.5px] font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-[11px] leading-5 text-subtle">
        {description}
      </p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function formatDateTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatShortDate(value: string) {
  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatMonthDay(value: string) {
  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return { month: "—", day: "—" };
  }
  return {
    month: new Intl.DateTimeFormat("en-US", {
      month: "short",
      timeZone: "UTC",
    }).format(date),
    day: new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      timeZone: "UTC",
    }).format(date),
  };
}

export function formatRelative(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60_000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function notificationTone(status: Notification["status"]): Tone {
  if (status === "sent") return "green";
  if (status === "failed") return "red";
  return "amber";
}

export function appointmentStatusTone(status: string): Tone {
  if (status === "confirmed") return "brand";
  if (status === "completed") return "green";
  if (status === "cancelled") return "red";
  return "gray";
}

export function escalationStatusTone(status: string): Tone {
  if (status === "open") return "red";
  if (status === "acknowledged") return "amber";
  if (status === "resolved") return "green";
  return "gray";
}

export function priorityTone(priority: string): Tone {
  if (priority === "high") return "red";
  if (priority === "medium") return "amber";
  return "gray";
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function phoneHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function mapHref(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
