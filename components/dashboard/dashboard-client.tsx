"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Briefcase,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  FileText,
  LayoutDashboard,
  MessageSquareText,
  MessagesSquare,
  Plug,
  Receipt,
  RefreshCw,
  Send,
  ShieldAlert,
  Siren,
  Stethoscope,
  XCircle,
} from "lucide-react";

import { AppointmentsPanel } from "@/components/dashboard/appointments-panel";
import { CalendarPanel } from "@/components/dashboard/calendar-panel";
import { ConversationsPanel } from "@/components/dashboard/conversations-panel";
import { KnowledgePanel, OrdersPanel } from "@/components/dashboard/data-panels";
import { DirectoryPanel } from "@/components/dashboard/directory-panel";
import { EscalationsPanel } from "@/components/dashboard/escalations-panel";
import { IntegrationsPanel } from "@/components/dashboard/integrations-panel";
import { Pill, StatCard, formatRelative } from "@/components/dashboard/ui";
import { Logo } from "@/components/site/logo";
import type {
  ConversationDetail,
  DashboardPayload,
} from "@/lib/types";

type Tab =
  | "doctor-conversations"
  | "appointments"
  | "calendar"
  | "directory"
  | "doctor-escalations"
  | "doctor-knowledge"
  | "business-conversations"
  | "orders"
  | "business-escalations"
  | "business-knowledge"
  | "integrations";

type Toast = { tone: "success" | "error"; message: string };

export function DashboardClient({
  googleStatus,
  googleReason,
}: {
  googleStatus?: "connected" | "error";
  googleReason?: string;
} = {}) {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>(
    googleStatus ? "integrations" : "doctor-conversations",
  );
  const [selectedId, setSelectedId] = useState<string>();
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [detailId, setDetailId] = useState<string>();
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string>();
  const [toast, setToast] = useState<Toast | null>(null);

  const conversationMode =
    tab === "doctor-conversations"
      ? "doctor"
      : tab === "business-conversations"
        ? "business"
        : null;
  const effectiveSelectedId = conversationMode
    ? data?.conversations.some(
        (conversation) =>
          conversation.id === selectedId &&
          conversation.mode === conversationMode,
      )
      ? selectedId
      : data?.conversations.find(
          (conversation) => conversation.mode === conversationMode,
        )?.id
    : selectedId;
  const detailLoading =
    Boolean(effectiveSelectedId) && detailId !== effectiveSelectedId;

  const notify = useCallback((tone: "success" | "error", message: string) => {
    setToast({ tone, message });
  }, []);

  const applyPayload = useCallback((payload: DashboardPayload) => {
    setData(payload);
    setSelectedId((current) =>
      current && payload.conversations.some((item) => item.id === current)
        ? current
        : payload.conversations[0]?.id,
    );
    setLastUpdated(new Date().toISOString());
    setError("");
    setRefreshVersion((current) => current + 1);
  }, []);

  const fetchDashboard = useCallback(async () => {
    const response = await fetch("/api/dashboard", { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as
      | (DashboardPayload & { error?: string })
      | null;
    if (!response.ok || !payload || !("stats" in payload)) {
      throw new Error(payload?.error ?? "Could not load dashboard data.");
    }
    return payload;
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const payload = await fetchDashboard();
      applyPayload(payload);
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "Could not load dashboard data.";
      setError(message);
      notify("error", message);
    } finally {
      setRefreshing(false);
    }
  }, [applyPayload, fetchDashboard, notify]);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const payload = await fetchDashboard();
        if (!active) return;
        applyPayload(payload);
      } catch (caught) {
        if (!active) return;
        setError(
          caught instanceof Error
            ? caught.message
            : "Could not load dashboard data.",
        );
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [applyPayload, fetchDashboard]);

  useEffect(() => {
    if (!effectiveSelectedId) return;

    let cancelled = false;
    const id = effectiveSelectedId;

    void fetch(`/api/conversations/${encodeURIComponent(id)}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | (ConversationDetail & { error?: string })
          | null;
        if (!response.ok || !payload?.conversation) {
          throw new Error(payload?.error ?? "Could not load this conversation.");
        }
        if (!cancelled) {
          setDetail(payload);
          setDetailId(id);
        }
      })
      .catch((caught) => {
        if (cancelled) return;
        setDetail(null);
        setDetailId(id);
        notify(
          "error",
          caught instanceof Error
            ? caught.message
            : "Could not load this conversation.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [effectiveSelectedId, notify, refreshVersion]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 5200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const handleDeleteConversation = async (id: string) => {
    try {
      const response = await fetch(
        `/api/conversations/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "Could not delete the conversation.");
      }
      setSelectedId((current) => (current === id ? undefined : current));
      notify("success", "Conversation deleted.");
      await refresh();
    } catch (caught) {
      notify(
        "error",
        caught instanceof Error
          ? caught.message
          : "Could not delete the conversation.",
      );
    }
  };

  const openConversation = (id: string) => {
    const target = data?.conversations.find((item) => item.id === id);
    setTab(
      target?.mode === "business"
        ? "business-conversations"
        : "doctor-conversations",
    );
    setSelectedId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const doctorConversations =
    data?.conversations.filter((item) => item.mode === "doctor").length ?? 0;
  const businessConversations =
    data?.conversations.filter((item) => item.mode === "business").length ?? 0;
  const doctorCases =
    data?.escalations.filter((item) => item.mode === "doctor").length ?? 0;
  const businessCases =
    data?.escalations.filter((item) => item.mode === "business").length ?? 0;
  const doctorPolicies =
    data?.knowledge.docs.filter((doc) => doc.mode === "doctor").length ?? 0;
  const businessPolicies =
    data?.knowledge.docs.filter((doc) => doc.mode === "business").length ?? 0;

  const tabGroups: Array<{
    label: string;
    tabs: Array<{
      id: Tab;
      label: string;
      icon: typeof LayoutDashboard;
      count?: number;
    }>;
  }> = data
    ? [
        {
          label: "Doctor care",
          tabs: [
            {
              id: "doctor-conversations",
              label: "Doctor chats",
              icon: MessageSquareText,
              count: doctorConversations,
            },
            {
              id: "appointments",
              label: "Appointments",
              icon: CalendarDays,
              count: data.stats.appointments,
            },
            { id: "calendar", label: "Calendar", icon: CalendarRange },
            {
              id: "directory",
              label: "Directory",
              icon: Stethoscope,
              count: data.stats.doctors,
            },
            {
              id: "doctor-escalations",
              label: "Doctor cases",
              icon: ShieldAlert,
              count: doctorCases,
            },
            {
              id: "doctor-knowledge",
              label: "Doctor policies",
              icon: BookOpen,
              count: doctorPolicies,
            },
          ],
        },
        {
          label: "Business support",
          tabs: [
            {
              id: "business-conversations",
              label: "Business chats",
              icon: Briefcase,
              count: businessConversations,
            },
            {
              id: "orders",
              label: "Orders",
              icon: Receipt,
              count: data.stats.orders,
            },
            {
              id: "business-escalations",
              label: "Business cases",
              icon: ShieldAlert,
              count: businessCases,
            },
            {
              id: "business-knowledge",
              label: "Business policies",
              icon: FileText,
              count: businessPolicies,
            },
          ],
        },
        {
          label: "Platform",
          tabs: [{ id: "integrations", label: "Integrations", icon: Plug }],
        },
      ]
    : [];

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1480px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Logo href="/" />
          <span className="hidden h-5 w-px bg-line sm:block" />
          <span className="hidden items-center gap-1.5 text-[11px] font-medium text-subtle sm:flex">
            <LayoutDashboard className="size-3.5" />
            Owner dashboard
          </span>

          <div className="ml-auto flex items-center gap-1.5">
            <span className="hidden sm:inline-flex">
              <Pill tone="amber">Demo workspace · no auth</Pill>
            </span>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[10px] font-medium text-ink transition-colors hover:bg-canvas disabled:opacity-50"
            >
              <RefreshCw
                className={`size-3 ${refreshing ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1.5 text-[10px] font-medium text-white transition-colors hover:bg-brand-deep"
            >
              Back to site
              <ArrowUpRight className="size-3" />
            </Link>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-[1480px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-brand">
              Support operations console
            </p>
            <h1 className="mt-1 text-[24px] font-semibold leading-tight tracking-tight text-ink sm:text-[30px]">
              Every conversation, action, and alert. Accountable.
            </h1>
            <p className="mt-1.5 max-w-2xl text-[11.5px] leading-5 text-subtle">
              Live transcripts and AI summaries, extracted facts, doctor
              records, appointment handoff, escalations, Telegram delivery
              status, and the exact knowledge sources behind each answer.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[9px] text-subtle">
              {lastUpdated
                ? `Updated ${formatRelative(lastUpdated)}`
                : "Loading workspace…"}
            </span>
            <Link
              href="/#support-chat"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-[10.5px] font-medium text-ink transition-colors hover:border-brand/25 hover:text-brand"
            >
              <MessageSquareText className="size-3.5" />
              Open Sage chat
            </Link>
          </div>
        </div>

        {loading && !data ? (
          <div className="mt-5 grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:grid-cols-7">
            {Array.from({ length: 7 }).map((_, index) => (
              <div
                key={index}
                className="h-[104px] animate-pulse rounded-2xl border border-line bg-white"
              />
            ))}
          </div>
        ) : !data ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-red-800">
              <XCircle className="size-4" />
              Dashboard unavailable
            </p>
            <p className="mt-1 text-[11px] text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-3 rounded-lg bg-brand px-3 py-1.5 text-[10px] font-medium text-white hover:bg-brand-deep"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:grid-cols-7">
              <StatCard
                label="Conversations"
                value={data.stats.conversations}
                detail={`${data.stats.messages} messages persisted`}
                icon={MessagesSquare}
              />
              <StatCard
                label="Urgent chats"
                value={data.stats.urgentConversations}
                detail="Flagged by triage for review"
                icon={Siren}
                tone="red"
              />
              <StatCard
                label="Appointments"
                value={data.stats.appointments}
                detail="Confirmed and upcoming"
                icon={CalendarDays}
                tone="green"
              />
              <StatCard
                label="Open cases"
                value={data.stats.escalations}
                detail="Clinical, refund, and incident"
                icon={ShieldAlert}
                tone="amber"
              />
              <StatCard
                label="Doctors"
                value={data.stats.doctors}
                detail="Live directory records"
                icon={Stethoscope}
                tone="brand"
              />
              <StatCard
                label="Orders"
                value={data.stats.orders}
                detail="Available to the order tool"
                icon={Receipt}
                tone="blue"
              />
              <StatCard
                label="Alerts sent"
                value={data.stats.notifications}
                detail={
                  data.integrations.telegram
                    ? "Telegram delivery is live"
                    : "Queued locally until configured"
                }
                icon={Send}
                tone={data.integrations.telegram ? "green" : "amber"}
              />
            </div>

            {error ? (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-900">
                <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
                {error}
              </div>
            ) : null}

            <nav aria-label="Dashboard sections" className="mt-5 space-y-1.5">
              {tabGroups.map((group) => (
                <div
                  key={group.label}
                  className="flex flex-wrap items-center gap-1 rounded-xl border border-line bg-white p-1.5 shadow-[0_1px_2px_rgba(16,24,40,0.03)]"
                >
                  <span className="w-full px-2 pb-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-subtle sm:w-28 sm:shrink-0 sm:pb-0">
                    {group.label}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-wrap gap-1">
                    {group.tabs.map((item) => {
                      const Icon = item.icon;
                      const active = tab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setTab(item.id)}
                          aria-current={active ? "page" : undefined}
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition-colors ${
                            active
                              ? "bg-brand text-white shadow-[0_1px_2px_rgba(74,28,58,0.25)]"
                              : "text-subtle hover:bg-canvas hover:text-ink"
                          }`}
                        >
                          <Icon className="size-3" />
                          {item.label}
                          {typeof item.count === "number" ? (
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[8px] font-semibold ${
                                active
                                  ? "bg-white/15 text-white"
                                  : "bg-canvas text-subtle ring-1 ring-line"
                              }`}
                            >
                              {item.count}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="mt-3">
              {tab === "doctor-conversations" ||
              tab === "business-conversations" ? (
                <ConversationsPanel
                  mode={tab === "doctor-conversations" ? "doctor" : "business"}
                  conversations={data.conversations.filter(
                    (conversation) =>
                      conversation.mode ===
                      (tab === "doctor-conversations" ? "doctor" : "business"),
                  )}
                  selectedId={effectiveSelectedId}
                  detail={detail}
                  loadingDetail={detailLoading}
                  onSelect={setSelectedId}
                  onDelete={handleDeleteConversation}
                />
              ) : null}

              {tab === "appointments" ? (
                <AppointmentsPanel
                  appointments={data.appointments}
                  onRefresh={() => refresh()}
                  notify={notify}
                />
              ) : null}

              {tab === "calendar" ? (
                <CalendarPanel
                  calendar={data.calendar}
                  appointments={data.appointments}
                  doctors={data.doctors}
                />
              ) : null}

              {tab === "doctor-escalations" ||
              tab === "business-escalations" ? (
                <EscalationsPanel
                  mode={
                    tab === "doctor-escalations" ? "doctor" : "business"
                  }
                  escalations={data.escalations.filter(
                    (item) =>
                      item.mode ===
                      (tab === "doctor-escalations" ? "doctor" : "business"),
                  )}
                  onRefresh={() => refresh()}
                  notify={notify}
                  onOpenConversation={openConversation}
                />
              ) : null}

              {tab === "directory" ? (
                <DirectoryPanel
                  doctors={data.doctors}
                  onRefresh={() => refresh()}
                  notify={notify}
                />
              ) : null}

              {tab === "orders" ? <OrdersPanel orders={data.orders} /> : null}

              {tab === "integrations" ? (
                <IntegrationsPanel
                  settings={data.settings}
                  integrations={data.integrations}
                  notifications={data.notifications}
                  googleStatus={googleStatus}
                  googleReason={googleReason}
                  onRefresh={() => refresh()}
                  notify={notify}
                />
              ) : null}

              {tab === "doctor-knowledge" ? (
                <KnowledgePanel mode="doctor" knowledge={data.knowledge} />
              ) : null}

              {tab === "business-knowledge" ? (
                <KnowledgePanel mode="business" knowledge={data.knowledge} />
              ) : null}
            </div>
          </>
        )}

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-line py-4 text-[9px] text-subtle">
          <p>
            SupportSage AI · local JSON persistence · demo records are labelled
            in the directory.
          </p>
          <p className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="size-3 text-emerald-600" />
            Every answer stores sources, tools, actions, and delivery status.
          </p>
        </footer>
      </main>

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-4 right-4 z-50 flex max-w-sm items-start gap-2 rounded-xl border px-3 py-2.5 text-[10.5px] shadow-lg ${
            toast.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {toast.tone === "success" ? (
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
          ) : (
            <XCircle className="mt-0.5 size-3.5 shrink-0" />
          )}
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}
