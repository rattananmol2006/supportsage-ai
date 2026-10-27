"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  Bot,
  FileText,
  Receipt,
  Search,
  ShieldAlert,
  Sparkles,
  Stethoscope,
} from "lucide-react";

import {
  EmptyState,
  Pill,
  SectionCard,
  StatCard,
  formatDateTime,
  formatRelative,
} from "@/components/dashboard/ui";
import type {
  DashboardPayload,
  KnowledgeDocSummary,
  KnowledgeType,
  Order,
} from "@/lib/types";

function orderStatusTone(status: string) {
  const lower = status.toLowerCase();
  if (lower.includes("duplicate")) return "red" as const;
  if (lower.includes("refund")) return "amber" as const;
  if (lower.includes("active")) return "green" as const;
  return "gray" as const;
}

function knowledgeTone(type: KnowledgeType) {
  if (type === "emergency") return "red" as const;
  if (type === "policy") return "amber" as const;
  if (type === "doctor") return "green" as const;
  if (type === "order") return "blue" as const;
  return "brand" as const;
}

export function OrdersPanel({ orders }: { orders: Order[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return orders;
    return orders.filter((order) =>
      `${order.id} ${order.customer} ${order.email} ${order.status} ${order.items}`
        .toLowerCase()
        .includes(query),
    );
  }, [orders, search]);

  const duplicates = orders.filter((order) => order.duplicateCharge).length;
  const refundRequests = orders.filter((order) =>
    order.status.toLowerCase().includes("refund"),
  ).length;
  const total = orders.reduce((sum, order) => sum + order.amount, 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <StatCard
          label="Orders"
          value={orders.length}
          detail="Demo records available to the order tool"
          icon={Receipt}
        />
        <StatCard
          label="Duplicate charges"
          value={duplicates}
          detail="Auto-refund under $100 after verification"
          icon={ShieldAlert}
          tone="red"
        />
        <StatCard
          label="Refund requests"
          value={refundRequests}
          detail="Requires policy check and owner follow-up"
          icon={Sparkles}
          tone="amber"
        />
        <StatCard
          label="Recorded value"
          value={`$${total.toFixed(0)}`}
          detail="Across the seeded demo order book"
          icon={Receipt}
          tone="green"
        />
      </div>

      <SectionCard
        title="Order book"
        description="Sage must look up an order before discussing a charge, refund, or plan. These records are also exposed through the live order lookup tool."
        action={
          <div className="relative w-52 max-w-full">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search orders…"
              aria-label="Search orders"
              className="h-8 w-full rounded-lg border border-line bg-canvas pl-8 pr-3 text-[10.5px] text-ink outline-none placeholder:text-subtle/80 focus:border-brand/35 focus:ring-2 focus:ring-brand/10"
            />
          </div>
        }
        contentClassName="p-0"
      >
        {filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Receipt}
              title="No orders match"
              description="Try an order number, customer name, or status."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-line bg-canvas/70 text-[8.5px] uppercase tracking-[0.13em] text-subtle">
                  <th className="px-4 py-2.5 font-semibold">Order</th>
                  <th className="px-3 py-2.5 font-semibold">Customer</th>
                  <th className="px-3 py-2.5 font-semibold">Item</th>
                  <th className="px-3 py-2.5 font-semibold">Amount</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/80">
                {filtered.map((order) => (
                  <tr key={order.id} className="align-top hover:bg-canvas/50">
                    <td className="px-4 py-3">
                      <p className="font-mono text-[10.5px] font-semibold text-ink">
                        #{order.id}
                      </p>
                      {order.duplicateCharge ? (
                        <Pill tone="red" className="mt-1">
                          Duplicate
                        </Pill>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-[10.5px] font-medium text-ink">
                        {order.customer}
                      </p>
                      <p className="text-[9px] text-subtle">{order.email}</p>
                    </td>
                    <td className="max-w-[240px] px-3 py-3">
                      <p className="text-[10px] font-medium text-ink">
                        {order.items}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[9px] leading-4 text-subtle">
                        {order.notes}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-[10.5px] font-semibold text-ink">
                      {order.currency} {order.amount}
                    </td>
                    <td className="px-3 py-3">
                      <Pill tone={orderStatusTone(order.status)}>
                        {order.status}
                      </Pill>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[9.5px] text-subtle">
                        {formatDateTime(order.createdAt)}
                      </p>
                      <p className="text-[8.5px] text-subtle/80">
                        {formatRelative(order.createdAt)}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-900">
          <ShieldAlert className="size-3.5" />
          Refund policy applied by the agent
        </p>
        <p className="mt-1 text-[9.5px] leading-4 text-amber-900/80">
          Duplicate charges are refunded after verification. Refunds under $100
          can be auto-approved; $100 or more requires manager approval. Standard
          refunds are available within 14 days. Sage never promises a refund
          before verification.
        </p>
      </div>
    </div>
  );
}

export function KnowledgePanel({
  knowledge,
}: {
  knowledge: DashboardPayload["knowledge"];
}) {
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState<"all" | "doctor" | "business">(
    "all",
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return knowledge.docs.filter((doc) => {
      if (modeFilter !== "all" && doc.mode !== modeFilter) return false;
      if (!query) return true;
      return `${doc.id} ${doc.title} ${doc.type}`.toLowerCase().includes(query);
    });
  }, [knowledge.docs, modeFilter, search]);

  const emergencyCount = knowledge.docs.filter(
    (doc) => doc.type === "emergency",
  ).length;
  const policyCount = knowledge.docs.filter(
    (doc) => doc.type === "policy",
  ).length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <StatCard
          label="Knowledge docs"
          value={knowledge.documents}
          detail="Retrieved and cited on every answer"
          icon={BookOpen}
        />
        <StatCard
          label="Doctor mode"
          value={knowledge.doctorKnowledge}
          detail="Clinical triage, directory, booking, labs"
          icon={Stethoscope}
          tone="green"
        />
        <StatCard
          label="Business mode"
          value={knowledge.businessKnowledge}
          detail="Orders, refunds, escalations, security"
          icon={Bot}
          tone="blue"
        />
        <StatCard
          label="Safety policies"
          value={emergencyCount + policyCount}
          detail={`${emergencyCount} emergency · ${policyCount} policy`}
          icon={ShieldAlert}
          tone="amber"
        />
      </div>

      <SectionCard
        title="RAG knowledge base"
        description="Answers are grounded in these documents. The agent retrieves passages with synonym expansion, prioritises emergency docs during triage, and cites the sources in the chat and transcript."
        action={
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="relative w-44 max-w-full">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search knowledge…"
                aria-label="Search knowledge documents"
                className="h-8 w-full rounded-lg border border-line bg-canvas pl-8 pr-3 text-[10px] text-ink outline-none placeholder:text-subtle/80 focus:border-brand/35 focus:ring-2 focus:ring-brand/10"
              />
            </div>
            {(
              [
                { id: "all", label: "All" },
                { id: "doctor", label: "Doctor" },
                { id: "business", label: "Business" },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setModeFilter(option.id)}
                aria-pressed={modeFilter === option.id}
                className={`rounded-md px-2 py-1 text-[9.5px] font-medium transition-colors ${
                  modeFilter === option.id
                    ? "bg-brand text-white"
                    : "text-subtle hover:bg-canvas hover:text-ink"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        }
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No documents match"
            description="Try a title, document ID, or a different mode."
          />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((doc: KnowledgeDocSummary) => (
              <div
                key={doc.id}
                className="rounded-xl border border-line bg-white p-3 transition-colors hover:border-brand/20"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="flex items-start gap-1.5 text-[10.5px] font-semibold leading-4 text-ink">
                    <FileText className="mt-0.5 size-3 shrink-0 text-brand/70" />
                    {doc.title}
                  </p>
                  <Pill tone={knowledgeTone(doc.type)}>{doc.type}</Pill>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="font-mono text-[8px] text-subtle">
                    {doc.id}
                  </span>
                  <span className="text-[8.5px] font-medium text-subtle">
                    {doc.mode === "shared" ? "Shared" : `${doc.mode} mode`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
