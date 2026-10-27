"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Clock,
  MessageSquareText,
  RotateCcw,
  ShieldAlert,
  Stethoscope,
} from "lucide-react";

import {
  EmptyState,
  Pill,
  SectionCard,
  escalationStatusTone,
  formatRelative,
  priorityTone,
} from "@/components/dashboard/ui";
import type { Escalation, EscalationType } from "@/lib/types";

type Filter = "open" | "all" | "resolved";

function typeTone(type: EscalationType) {
  if (type === "emergency" || type === "urgent") return "red" as const;
  if (type === "refund") return "amber" as const;
  return "brand" as const;
}

export function EscalationsPanel({
  escalations,
  onRefresh,
  notify,
  onOpenConversation,
}: {
  escalations: Escalation[];
  onRefresh: () => Promise<void>;
  notify: (tone: "success" | "error", message: string) => void;
  onOpenConversation: (id: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>("open");
  const [busyId, setBusyId] = useState<string | null>(null);

  const openCount = escalations.filter(
    (escalation) => escalation.status === "open",
  ).length;

  const filtered = useMemo(() => {
    if (filter === "all") return escalations;
    if (filter === "resolved") {
      return escalations.filter(
        (escalation) => escalation.status === "resolved",
      );
    }
    return escalations.filter((escalation) => escalation.status !== "resolved");
  }, [escalations, filter]);

  const updateStatus = async (id: string, status: Escalation["status"]) => {
    setBusyId(id);
    try {
      const response = await fetch(`/api/escalations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(data?.error ?? "Could not update the case.");
      }
      notify("success", `Case marked ${status}.`);
      await onRefresh();
    } catch (error) {
      notify(
        "error",
        error instanceof Error ? error.message : "Could not update the case.",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SectionCard
      title="Escalation queue"
      description="Every urgent clinical case, refund request, and security issue opens a tracked case with the full transcript. Telegram delivery is logged below in Integrations."
      action={
        <div className="flex flex-wrap gap-1">
          {(
            [
              { id: "open", label: `Open${openCount ? ` (${openCount})` : ""}` },
              { id: "all", label: "All" },
              { id: "resolved", label: "Resolved" },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              aria-pressed={filter === option.id}
              className={`rounded-md px-2 py-1 text-[9.5px] font-medium transition-colors ${
                filter === option.id
                  ? "bg-brand text-white"
                  : "text-subtle hover:bg-canvas hover:text-ink"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      }
      contentClassName={
        filtered.length === 0 ? "p-4 sm:p-5" : "space-y-2.5 p-4 sm:p-5"
      }
    >
      {filtered.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="No cases in this view"
          description="Urgent chats, refund requests, and incidents automatically create a case with a reference, priority, and routed owner or doctor."
        />
      ) : (
        filtered.map((escalation) => {
          const busy = busyId === escalation.id;
          return (
            <article
              key={escalation.id}
              className={`rounded-xl border bg-white p-3 ${
                escalation.priority === "high"
                  ? "border-red-200"
                  : "border-line"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-1.5 text-[12px] font-semibold text-ink">
                    <ShieldAlert
                      className={`size-3.5 ${
                        escalation.priority === "high"
                          ? "text-red-600"
                          : "text-amber-600"
                      }`}
                    />
                    {escalation.subject}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[9.5px] text-subtle">
                    <span className="font-mono font-medium text-ink">
                      {escalation.reference}
                    </span>
                    <span>·</span>
                    <span>{formatRelative(escalation.createdAt)}</span>
                    <span>·</span>
                    <span>
                      {escalation.mode === "doctor" ? "Doctor mode" : "Business mode"}
                    </span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <Pill tone={typeTone(escalation.type)}>
                    {escalation.type}
                  </Pill>
                  <Pill tone={priorityTone(escalation.priority)}>
                    {escalation.priority}
                  </Pill>
                  <Pill tone={escalationStatusTone(escalation.status)}>
                    {escalation.status}
                  </Pill>
                </div>
              </div>

              <p className="mt-2 whitespace-pre-wrap rounded-lg border border-line/80 bg-canvas/60 p-2.5 text-[10.5px] leading-[1.65] text-subtle">
                {escalation.details}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {escalation.doctorName ? (
                  <span className="inline-flex items-center gap-1 text-[9.5px] font-medium text-brand">
                    <Stethoscope className="size-3" />
                    Routed to {escalation.doctorName}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[9.5px] text-subtle">
                    <Clock className="size-3" />
                    Routed to owner queue
                  </span>
                )}

                {escalation.conversationId ? (
                  <button
                    type="button"
                    onClick={() =>
                      onOpenConversation(escalation.conversationId as string)
                    }
                    className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-1 text-[9.5px] font-medium text-ink transition-colors hover:border-brand/25 hover:text-brand"
                  >
                    <MessageSquareText className="size-3" />
                    Open transcript
                  </button>
                ) : null}

                <div className="ml-auto flex flex-wrap gap-1">
                  {escalation.status === "open" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void updateStatus(escalation.id, "acknowledged")
                      }
                      className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[9.5px] font-medium text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-50"
                    >
                      <Clock className="size-3" />
                      Acknowledge
                    </button>
                  ) : null}
                  {escalation.status !== "resolved" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void updateStatus(escalation.id, "resolved")}
                      className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9.5px] font-medium text-emerald-800 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                    >
                      <Check className="size-3" />
                      Resolve
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void updateStatus(escalation.id, "open")}
                      className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-1 text-[9.5px] font-medium text-subtle transition-colors hover:bg-canvas disabled:opacity-50"
                    >
                      <RotateCcw className="size-3" />
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })
      )}
    </SectionCard>
  );
}
