import { getSettings, updateSettings } from "@/lib/db";
import { addDays, todayInTimeZone, zonedToUtc } from "@/lib/scheduling";
import type { Appointment } from "@/lib/types";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";

export const GOOGLE_OAUTH_STATE_COOKIE = "supportsage_google_oauth_state";

/**
 * openid/email/profile identify the connected account in the dashboard.
 * calendar.events can list, create, update, and delete events without granting
 * access to unrelated Google services.
 */
export const GOOGLE_OAUTH_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.events",
];

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  configured: boolean;
  source: "dashboard" | "environment" | "none";
};

export type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
};

export type GoogleCalendarEvent = {
  id: string;
  htmlLink: string;
  hangoutLink?: string;
};

export type GoogleCalendarEventInput = {
  summary: string;
  description: string;
  location?: string;
  date: string;
  time: string;
  durationMinutes: number;
  timezone: string;
  reminderMinutesBefore?: number;
};

export class GoogleOAuthError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "GoogleOAuthError";
    this.code = code;
  }
}

export function getGoogleOAuthConfig(): GoogleOAuthConfig {
  const settings = getSettings();
  const clientId =
    settings.googleClientId || process.env.GOOGLE_CLIENT_ID?.trim() || "";
  const clientSecret =
    settings.googleClientSecret ||
    process.env.GOOGLE_CLIENT_SECRET?.trim() ||
    "";
  const source = settings.googleClientId
    ? ("dashboard" as const)
    : clientId
      ? ("environment" as const)
      : ("none" as const);

  return {
    clientId,
    clientSecret,
    configured: Boolean(clientId && clientSecret),
    source,
  };
}

export function getGoogleRedirectUri(origin?: string): string {
  const configured = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (configured) return configured;

  const base =
    origin || process.env.APP_URL?.trim() || "http://localhost:3000";
  return new URL("/api/integrations/google/callback", base).toString();
}

export function getGoogleConnection() {
  const config = getGoogleOAuthConfig();
  const settings = getSettings();
  return {
    configured: config.configured,
    connected: Boolean(config.configured && settings.googleRefreshToken),
    email: settings.googleConnectedEmail,
    calendarId: settings.googleCalendarId || "primary",
    connectedAt: settings.googleConnectedAt,
    redirectUri: getGoogleRedirectUri(),
    source: config.source,
  };
}

export function isGoogleCalendarConnected(): boolean {
  const config = getGoogleOAuthConfig();
  return Boolean(config.configured && getSettings().googleRefreshToken);
}

export function buildGoogleAuthUrl(input: {
  state: string;
  redirectUri: string;
  loginHint?: string;
}): string {
  const config = getGoogleOAuthConfig();
  if (!config.configured) {
    throw new GoogleOAuthError(
      "not_configured",
      "Add a Google OAuth client ID and client secret first.",
    );
  }

  const url = new URL(AUTH_URL);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_OAUTH_SCOPES.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", input.state);
  if (input.loginHint) url.searchParams.set("login_hint", input.loginHint);
  return url.toString();
}

function tokenError(data: unknown, fallback: string): string {
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    const description = record.error_description;
    if (typeof description === "string" && description) return description;
    const error = record.error;
    if (typeof error === "string" && error) return error;
  }
  return fallback;
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function exchangeGoogleCode(input: {
  code: string;
  redirectUri: string;
}): Promise<GoogleTokenResponse> {
  const config = getGoogleOAuthConfig();
  if (!config.configured) {
    throw new GoogleOAuthError(
      "not_configured",
      "Google OAuth credentials are missing.",
    );
  }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: input.code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: input.redirectUri,
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const data = await parseJson(response);

  if (!response.ok) {
    console.error(
      `[google-calendar] token exchange failed (${response.status}): ${tokenError(
        data,
        "unknown error",
      ).slice(0, 300)}`,
    );
    throw new GoogleOAuthError(
      "token_exchange_failed",
      "Google rejected the authorisation code.",
    );
  }

  const tokens = data as GoogleTokenResponse;
  if (!tokens?.access_token) {
    throw new GoogleOAuthError(
      "token_exchange_failed",
      "Google did not return an access token.",
    );
  }
  return tokens;
}

export async function fetchGoogleEmail(accessToken: string) {
  const response = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!response.ok) return undefined;
  const data = (await parseJson(response)) as { email?: unknown } | null;
  return typeof data?.email === "string" ? data.email : undefined;
}

async function getAccessToken(): Promise<string> {
  const settings = getSettings();
  const config = getGoogleOAuthConfig();
  if (!config.configured) {
    throw new GoogleOAuthError(
      "not_configured",
      "Google OAuth credentials are missing.",
    );
  }

  const expiresAt = settings.googleTokenExpiresAt
    ? new Date(settings.googleTokenExpiresAt).getTime()
    : 0;
  if (settings.googleAccessToken && expiresAt - 60_000 > Date.now()) {
    return settings.googleAccessToken;
  }

  if (!settings.googleRefreshToken) {
    throw new GoogleOAuthError(
      "not_connected",
      "Google Calendar is not connected.",
    );
  }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: settings.googleRefreshToken,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const data = await parseJson(response);

  if (!response.ok) {
    console.error(
      `[google-calendar] token refresh failed (${response.status}): ${tokenError(
        data,
        "unknown error",
      ).slice(0, 300)}`,
    );
    throw new GoogleOAuthError(
      "reauth_required",
      "Google Calendar needs to be reconnected.",
    );
  }

  const tokens = data as GoogleTokenResponse;
  if (!tokens?.access_token) {
    throw new GoogleOAuthError(
      "reauth_required",
      "Google did not return a refreshed access token.",
    );
  }

  updateSettings({
    googleAccessToken: tokens.access_token,
    googleTokenExpiresAt: new Date(
      Date.now() + (Number(tokens.expires_in) || 3600) * 1000,
    ).toISOString(),
    ...(tokens.refresh_token
      ? { googleRefreshToken: tokens.refresh_token }
      : {}),
  });

  return tokens.access_token;
}

async function calendarRequest(
  path: string,
  init: RequestInit,
): Promise<Response> {
  const token = await getAccessToken();
  return fetch(`${CALENDAR_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
}

function calendarErrorDetail(data: unknown): string {
  if (data && typeof data === "object") {
    const record = data as { error?: { message?: unknown } };
    if (typeof record.error?.message === "string") {
      return record.error.message.slice(0, 240);
    }
  }
  return "";
}

export async function createGoogleCalendarEvent(
  input: GoogleCalendarEventInput,
): Promise<GoogleCalendarEvent> {
  if (!isGoogleCalendarConnected()) {
    throw new GoogleOAuthError(
      "not_connected",
      "Google Calendar is not connected.",
    );
  }

  const settings = getSettings();
  const calendarId = settings.googleCalendarId || "primary";
  const start = zonedToUtc(input.date, input.time, input.timezone);
  const end = new Date(start.getTime() + input.durationMinutes * 60_000);
  const reminder = Math.min(
    40_320,
    Math.max(
      0,
      Math.round(
        input.reminderMinutesBefore ?? 60,
      ),
    ),
  );

  const response = await calendarRequest(
    `/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=none`,
    {
      method: "POST",
      body: JSON.stringify({
        summary: input.summary,
        description: input.description,
        location: input.location,
        start: {
          dateTime: start.toISOString(),
          timeZone: input.timezone,
        },
        end: {
          dateTime: end.toISOString(),
          timeZone: input.timezone,
        },
        reminders: {
          useDefault: false,
          overrides: [{ method: "popup", minutes: reminder }],
        },
      }),
    },
  );
  const data = await parseJson(response);

  if (!response.ok) {
    const detail = calendarErrorDetail(data);
    console.error(
      `[google-calendar] event create failed (${response.status}): ${detail || "unknown error"}`,
    );
    throw new Error(
      detail
        ? `Google Calendar rejected the event: ${detail}`
        : `Google Calendar returned ${response.status}.`,
    );
  }

  const event = data as { id?: unknown; htmlLink?: unknown; hangoutLink?: unknown };
  if (typeof event?.id !== "string" || typeof event?.htmlLink !== "string") {
    throw new Error("Google Calendar returned an incomplete event.");
  }

  return {
    id: event.id,
    htmlLink: event.htmlLink,
    hangoutLink:
      typeof event.hangoutLink === "string" ? event.hangoutLink : undefined,
  };
}

export async function createEventForAppointment(
  appointment: Appointment,
): Promise<GoogleCalendarEvent> {
  return createGoogleCalendarEvent({
    summary: `Appointment · ${appointment.doctorName}`,
    description: [
      `${appointment.doctorSpecialty} · ${appointment.clinic}`,
      `Patient: ${appointment.patientName}`,
      `Phone: ${appointment.phone}`,
      `Reason: ${appointment.reason}`,
      `Reference: ${appointment.reference}`,
      "Booked through SupportSage AI",
    ].join("\n"),
    location: appointment.location,
    date: appointment.date,
    time: appointment.time,
    durationMinutes: appointment.durationMinutes,
    timezone: appointment.timezone,
    reminderMinutesBefore: appointment.reminderMinutesBefore,
  });
}

export async function updateGoogleCalendarReminder(
  eventId: string,
  reminderMinutesBefore: number,
) {
  const reminder = Math.min(40_320, Math.max(0, Math.round(reminderMinutesBefore)));
  const response = await calendarRequest(
    `/calendars/${encodeURIComponent(
      getSettings().googleCalendarId || "primary",
    )}/events/${encodeURIComponent(eventId)}?sendUpdates=none`,
    {
      method: "PATCH",
      body: JSON.stringify({
        reminders: {
          useDefault: false,
          overrides: [{ method: "popup", minutes: reminder }],
        },
      }),
    },
  );
  if (!response.ok && response.status !== 404 && response.status !== 410) {
    const detail = calendarErrorDetail(await parseJson(response));
    throw new Error(
      detail
        ? `Google Calendar could not update the reminder: ${detail}`
        : `Google Calendar returned ${response.status}.`,
    );
  }
}

export async function deleteGoogleCalendarEvent(eventId: string) {
  const response = await calendarRequest(
    `/calendars/${encodeURIComponent(
      getSettings().googleCalendarId || "primary",
    )}/events/${encodeURIComponent(eventId)}?sendUpdates=none`,
    { method: "DELETE" },
  );
  if (!response.ok && response.status !== 404 && response.status !== 410) {
    const detail = calendarErrorDetail(await parseJson(response));
    throw new Error(
      detail
        ? `Google Calendar could not delete the event: ${detail}`
        : `Google Calendar returned ${response.status}.`,
    );
  }
}

export async function revokeGoogleToken(token: string) {
  const response = await fetch(REVOKE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Google token revoke returned ${response.status}.`);
  }
}

export async function createTestCalendarEvent() {
  const timezone = getSettings().timezone;
  return createGoogleCalendarEvent({
    summary: "SupportSage AI · test event",
    description:
      "This event verifies that SupportSage can write appointments to this Google Calendar. You can delete it.",
    date: addDays(todayInTimeZone(timezone), 1),
    time: "10:00",
    durationMinutes: 15,
    timezone,
    reminderMinutesBefore: 30,
  });
}
