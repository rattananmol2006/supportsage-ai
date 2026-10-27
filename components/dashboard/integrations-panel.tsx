"use client";

import { useState, type FormEvent } from "react";
import {
  BellRing,
  Bot,
  CalendarPlus,
  CheckCircle2,
  Database,
  KeyRound,
  Send,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";

import {
  Pill,
  SectionCard,
  formatDateTime,
  formatRelative,
  notificationTone,
} from "@/components/dashboard/ui";
import { Input } from "@/components/ui/input";
import type {
  DashboardPayload,
  Notification,
  PublicSettings,
} from "@/lib/types";

type Integrations = DashboardPayload["integrations"];

const fieldClass =
  "h-9 rounded-lg border-line bg-white text-[11.5px] text-ink placeholder:text-subtle/70 focus-visible:border-brand/40 focus-visible:ring-brand/10";
const labelClass =
  "mb-1 block text-[9px] font-semibold uppercase tracking-[0.12em] text-subtle";

function ConnectionTile({
  icon: Icon,
  label,
  value,
  detail,
  connected,
  badge,
}: {
  icon: typeof Bot;
  label: string;
  value: string;
  detail: string;
  connected: boolean;
  badge?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg border border-line bg-canvas text-brand">
          <Icon className="size-3.5" />
        </span>
        <Pill tone={connected ? "green" : "amber"}>
          {badge ?? (connected ? "Connected" : "Action needed")}
        </Pill>
      </div>
      <p className="mt-2 text-[11px] font-semibold text-ink">{label}</p>
      <p className="mt-0.5 text-[10px] font-medium text-subtle">{value}</p>
      <p className="mt-1 text-[9.5px] leading-4 text-subtle/90">{detail}</p>
    </div>
  );
}

export function IntegrationsPanel({
  settings,
  integrations,
  notifications,
  onRefresh,
  notify,
}: {
  settings: PublicSettings;
  integrations: Integrations;
  notifications: Notification[];
  onRefresh: () => Promise<void>;
  notify: (tone: "success" | "error", message: string) => void;
}) {
  const [clinicName, setClinicName] = useState(settings.clinicName);
  const [clinicPhone, setClinicPhone] = useState(settings.clinicPhone);
  const [timezone, setTimezone] = useState(settings.timezone);
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setTestResult(null);
    try {
      const payload: Record<string, string> = {
        clinicName,
        clinicPhone,
        timezone,
      };
      if (botToken.trim()) payload.telegramBotToken = botToken.trim();
      if (chatId.trim()) payload.telegramChatId = chatId.trim();

      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        message?: string;
      } | null;
      if (!response.ok) {
        throw new Error(data?.error ?? "Could not save settings.");
      }
      setBotToken("");
      setChatId("");
      notify(
        "success",
        data?.message ??
          "Settings saved. Telegram credentials stay server-side.",
      );
      await onRefresh();
    } catch (error) {
      notify(
        "error",
        error instanceof Error ? error.message : "Could not save settings.",
      );
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    if (testing) return;
    setTesting(true);
    setTestResult(null);
    try {
      const response = await fetch("/api/settings/test-telegram", {
        method: "POST",
      });
      const data = (await response.json().catch(() => null)) as {
        status?: string;
        message?: string;
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(data?.error ?? "Telegram did not accept the alert.");
      }
      const result = {
        tone: "success" as const,
        message:
          data?.message ??
          "Test alert sent. Check the configured Telegram chat.",
      };
      setTestResult(result);
      notify(result.tone, result.message);
      await onRefresh();
    } catch (error) {
      const result = {
        tone: "error" as const,
        message:
          error instanceof Error
            ? error.message
            : "Telegram did not accept the alert.",
      };
      setTestResult(result);
      notify(result.tone, result.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-3">
      <SectionCard
        title="Integrations and delivery"
        description="Server-side configuration for the RAG agent, Telegram notifications, calendar handoff, and local persistence."
      >
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          <ConnectionTile
            icon={Sparkles}
            label="Groq inference"
            value={integrations.groq ? "Live" : "Key missing"}
            detail="openai/gpt-oss-120b with tool calling, server-side only."
            connected={integrations.groq}
          />
          <ConnectionTile
            icon={Send}
            label="Telegram alerts"
            value={integrations.telegram ? "Delivering live" : "Queued locally"}
            detail={
              integrations.telegram
                ? `Chat ${settings.telegramChatIdMasked} via ${settings.telegramSource}.`
                : "Cases and bookings are logged; add a bot token and chat ID to deliver."
            }
            connected={integrations.telegram}
          />
          <ConnectionTile
            icon={CalendarPlus}
            label="Google Calendar"
            value="Event link + ICS"
            detail="Prefilled event links and downloadable .ics files work without OAuth."
            connected
            badge="Link + ICS"
          />
          <ConnectionTile
            icon={Database}
            label="Persistence"
            value="Local JSON store"
            detail="Conversations, doctor records, orders, and audit events survive restarts."
            connected
          />
        </div>
      </SectionCard>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <SectionCard
          title="Clinic and Telegram settings"
          description="Tokens are stored only on the server and are never returned to this dashboard. Leave the token and chat ID blank to keep the current values."
        >
          <form onSubmit={(event) => void save(event)}>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <label>
                <span className={labelClass}>Clinic name</span>
                <Input
                  value={clinicName}
                  onChange={(event) => setClinicName(event.target.value)}
                  required
                  className={fieldClass}
                />
              </label>
              <label>
                <span className={labelClass}>Clinic phone</span>
                <Input
                  value={clinicPhone}
                  onChange={(event) => setClinicPhone(event.target.value)}
                  required
                  className={fieldClass}
                />
              </label>
              <label>
                <span className={labelClass}>IANA timezone</span>
                <Input
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                  placeholder="Asia/Kolkata"
                  required
                  className={fieldClass}
                />
              </label>
              <label>
                <span className={labelClass}>Telegram chat ID</span>
                <Input
                  value={chatId}
                  onChange={(event) => setChatId(event.target.value)}
                  placeholder={
                    settings.telegramChatIdMasked
                      ? `Current: ${settings.telegramChatIdMasked}`
                      : "e.g. 123456789"
                  }
                  className={fieldClass}
                />
              </label>
              <label className="sm:col-span-2">
                <span className={labelClass}>Telegram bot token</span>
                <Input
                  type="password"
                  value={botToken}
                  onChange={(event) => setBotToken(event.target.value)}
                  placeholder={
                    integrations.telegram
                      ? "Connected — enter a new token to replace it"
                      : "Paste the token from @BotFather"
                  }
                  autoComplete="new-password"
                  className={fieldClass}
                />
              </label>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[10px] font-medium text-white transition-colors hover:bg-brand-deep disabled:opacity-50"
              >
                <KeyRound className="size-3" />
                {saving ? "Saving…" : "Save settings"}
              </button>
              <button
                type="button"
                onClick={() => void sendTest()}
                disabled={testing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-[10px] font-medium text-ink transition-colors hover:bg-canvas disabled:opacity-50"
              >
                <BellRing className="size-3" />
                {testing ? "Testing…" : "Send test alert"}
              </button>
              <span className="text-[9px] text-subtle">
                Source: {settings.telegramSource}
              </span>
            </div>

            {testResult ? (
              <p
                className={`mt-2 flex items-start gap-1.5 rounded-md border px-2 py-1.5 text-[10px] leading-4 ${
                  testResult.tone === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {testResult.tone === "success" ? (
                  <CheckCircle2 className="mt-0.5 size-3 shrink-0" />
                ) : (
                  <XCircle className="mt-0.5 size-3 shrink-0" />
                )}
                {testResult.message}
              </p>
            ) : null}
          </form>
        </SectionCard>

        <SectionCard
          title="Connect Telegram in 3 steps"
          description="Real delivery needs a bot token and a chat ID. Everything before delivery is already logged."
        >
          <ol className="space-y-2.5">
            {[
              {
                title: "Create the bot",
                body: "Open @BotFather in Telegram, send /newbot, and copy the HTTP API token.",
              },
              {
                title: "Get the chat ID",
                body: "Send a message to the bot, then use @userinfobot or the Telegram getUpdates API to find the chat ID.",
              },
              {
                title: "Save and test",
                body: "Paste both values above, save, and send a test alert. Per-doctor chat IDs can be added in the directory.",
              },
            ].map((step, index) => (
              <li key={step.title} className="flex gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-[9px] font-semibold text-white">
                  {index + 1}
                </span>
                <div>
                  <p className="text-[10.5px] font-semibold text-ink">
                    {step.title}
                  </p>
                  <p className="mt-0.5 text-[9.5px] leading-4 text-subtle">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5">
            <p className="flex items-center gap-1.5 text-[9.5px] font-semibold text-amber-900">
              <ShieldCheck className="size-3" />
              Honest status by design
            </p>
            <p className="mt-1 text-[9px] leading-4 text-amber-900/80">
              If Telegram is not configured, Sage says the alert is queued. It
              never claims a queued alert was delivered.
            </p>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Notification log"
        description="Every appointment and escalation alert, including queued and failed attempts, is recorded here for the audit trail."
        action={
          <span className="text-[9px] text-subtle">
            {notifications.length} recent
          </span>
        }
        contentClassName="p-0"
      >
        {notifications.length === 0 ? (
          <p className="p-4 text-[11px] text-subtle">
            No notifications yet. Book an appointment or open an escalation to
            create one.
          </p>
        ) : (
          <div className="divide-y divide-line/80">
            {notifications.map((notification) => (
              <div key={notification.id} className="px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-semibold text-ink">
                      <Send className="size-3 text-brand" />
                      {notification.relatedType
                        ? notification.relatedType.replace(/_/g, " ")
                        : "Alert"}
                      {notification.relatedId ? (
                        <span className="font-mono text-[9px] font-normal text-subtle">
                          {notification.relatedId}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-[9px] text-subtle">
                      To {notification.recipient} ·{" "}
                      {formatDateTime(notification.createdAt)} ·{" "}
                      {formatRelative(notification.createdAt)}
                    </p>
                  </div>
                  <Pill tone={notificationTone(notification.status)}>
                    {notification.status}
                  </Pill>
                </div>
                <p className="mt-1.5 line-clamp-2 whitespace-pre-wrap text-[10px] leading-4 text-subtle">
                  {notification.message}
                </p>
                {notification.error ? (
                  <p className="mt-1 text-[9px] text-red-600">
                    {notification.error}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
