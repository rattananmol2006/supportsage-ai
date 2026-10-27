# SupportSage AI

An accountable, tool-using support agent for clinics and subscription businesses. Sage retrieves
grounded knowledge, reads live records, takes real actions, escalates to a human, and leaves an
auditable trail in the owner dashboard.

This repository is a working demo, not a mock: chats persist, doctor records are searchable, slots
are checked against booked appointments, appointments generate Google Calendar and `.ics` handoff
links, and every escalation is written to the dashboard with its Telegram delivery status.

> The doctor directory is real: 20 Chandigarh records are transcribed from the ESIC authorised medical
> attendants list (effective 01-06-2023 to 31-05-2024). The ESIC list does not publish consultation
> hours, fees, or languages, so those fields say “call clinic to confirm” and the booking windows are
> labelled demo schedules. Orders, business records, and dashboard authentication remain demo data.
> Replace the demo order book before using this with real customers.

## What works

### Doctor mode

- Urgency triage for emergency red flags, suspected typhoid, fever of 3+ days, severe abdominal
  pain, dehydration, breathing difficulty, chest pain, and similar symptoms.
- Retrieval-augmented answers from a 24-document clinical and operational knowledge base.
- Search across 20 real Chandigarh ESIC doctors by name, specialty, clinic, sector, or health problem.
  Skin, eye, child health, orthopaedics, ENT, gynaecology, medicine, and general surgery queries resolve
  to different specialists rather than one repeated fictional doctor.
- Doctor cards with the ESIC source link, qualification, clinic, address, phone, and next available
  slots. Email is shown only when the record actually has one.
- Appointment booking with live slot validation, reference generation, Google Calendar link, and
  downloadable `.ics` file with a `VALARM` reminder.
- If the requested day or slot is full, Sage books the next open slot and clearly tells the patient
  that their first choice was unavailable.
- Every appointment stores a reminder lead time (15 minutes to 1 week before) and can be changed from
  the dashboard.
- Urgent escalation routed to the matched doctor with a Telegram alert attempt and dashboard record.
- A prominent emergency panel with local emergency numbers and the clinic phone.

### Business Owner mode

- Order lookup against the live order book before any charge or refund discussion.
- Duplicate-charge and refund-policy answers grounded in the business knowledge base.
- Escalation to the owner queue with priority, reference, transcript, and Telegram status.
- Order facts, key facts, and summaries stay in Business context; a business escalation never gets
  routed to a doctor.

### Owner dashboard (`/dashboard`)

The dashboard is split into three visible groups so Doctor and Business data never mix:

**Doctor care**

1. **Doctor chats** — only Doctor-mode conversations, with AI summaries, extracted facts, full
   transcripts, linked appointments and cases, sources, tools, and delivery status.
2. **Appointments** — confirmed, completed, and cancelled bookings; status changes; reminder timing;
   automatic next-slot rebooking notes; Google Calendar and `.ics` handoff.
3. **Calendar** — 35-day availability view (last 7 days, today, next 4 weeks), doctor filter, open and
   booked counts per doctor/day, day detail, appointments, and upcoming reminders.
4. **Directory** — 20 real Chandigarh ESIC doctors with source links, search, add, and remove.
5. **Doctor cases** — Doctor-mode escalations only.
6. **Doctor policies** — Doctor-mode knowledge documents only.

**Business support**

7. **Business chats** — only Business-mode conversations.
8. **Orders** — the seeded order book exposed to the business agent.
9. **Business cases** — Business-mode escalations only, never routed to a doctor.
10. **Business policies** — Business-mode knowledge documents only.

**Platform**

11. **Integrations** — Groq, Telegram, and Google Calendar connection status; clinic settings;
    Google OAuth setup; Telegram test alert; Google test event; and the append-only notification
    log.

## Quick start

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env.local   # macOS/Linux; on Windows use: Copy-Item .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The chat launcher is in the bottom-right
corner; the dashboard is at [http://localhost:3000/dashboard](http://localhost:3000/dashboard).

For a production-style demo:

```bash
npm run build
npm run start
```

### Environment

Create `.env.local` in the project root. Never commit it and never prefix the Groq key with
`NEXT_PUBLIC_`.

```bash
# Required for live answers
GROQ_API_KEY=your_groq_api_key

# Optional; defaults to openai/gpt-oss-120b
GROQ_MODEL=openai/gpt-oss-120b

# Optional; can also be saved from Dashboard → Integrations
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Optional; Google Calendar OAuth (can also be saved in the dashboard)
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/google/callback
APP_URL=http://localhost:3000
```

`TELEGRAM_*` values are optional. Without them, appointment and escalation alerts are still logged
as `queued`; the agent explicitly tells the user that the alert is queued rather than claiming it was
delivered.

`GOOGLE_*` values are optional. Without them, bookings keep the prefilled Google Calendar link and
`.ics` download. With them, connect the calendar from **Dashboard → Integrations → Google Calendar
OAuth** so bookings create real events.

## Five-minute demo

### 1. Urgent doctor flow

Open the chat, choose **Doctor**, and send:

> I have had a high fever of 103F for four days with a severe headache and abdominal pain. I think
> it might be typhoid. I live in Sector 20, Chandigarh, and need help today.

Expected behavior:

- An urgent pathway banner and emergency contacts appear.
- Sage retrieves typhoid and fever sources and cites them.
- A real Chandigarh ESIC doctor card appears (for example Dr. Vinod Kumar Rampal, General Medicine,
  Sector 20-D) with phone, clinic address, qualification, ESIC source link, and live slots.
- An urgent escalation is created and the Telegram alert is queued or sent depending on settings.
- Follow up with a specific slot:

> Yes, please book the earliest slot with Dr. Vinod Kumar Rampal for Anmol Rattan. Phone
> +91 98765 43210. Reason: fever and suspected typhoid follow-up. Remind me one day before.

The reply must confirm the booking only after `book_appointment` succeeds. It includes the
appointment reference, date, time, reminder lead time, calendar link, and `.ics` link. If the
requested slot is full, Sage books the next open slot and states clearly that the first choice was
unavailable. The dashboard shows the linked conversation, appointment, and escalation.

### 2. Business refund flow

Switch to **Business Owner** and send:

> Hi, I was charged twice for order #1042. I am Riya Sharma. Please refund the duplicate charge
> today or I will dispute it with my bank.

Expected behavior:

- Sage looks up order `#1042` and states the verified duplicate charge.
- A refund escalation is created with a reference, priority, policy note, and Telegram status.
- The conversation summary and key facts contain the order and customer, but no doctor routing.
- The dashboard **Business cases** tab shows the refund case routed to the owner queue.

### 3. Dashboard walkthrough

Use **Doctor chats** to inspect the clinical transcript, **Appointments** to change the reminder or
download the `.ics`, **Calendar** to see 35-day availability and reminders, **Doctor cases** to
acknowledge clinical escalations, and **Directory** to browse the real Chandigarh ESIC list. Switch to
the **Business support** group for Business chats, Orders, cases, and policies. **Integrations** holds
the notification log.

## Architecture

```text
Chat widget
  └─ POST /api/chat
       ├─ validate + persist user message
       ├─ triage (emergency / urgent / routine)
       ├─ extract key facts from the message
       ├─ retrieveKnowledge() over the 24-doc knowledge base
       ├─ runAgent()
       │    ├─ Groq chat completion (server-side key)
       │    ├─ tool loop: search_doctors, get_doctor_schedule, book_appointment,
       │    │             lookup_order, escalate_case
       │    ├─ live JSON data + scheduling checks
       │    ├─ Telegram delivery attempt and notification log
       │    └─ deterministic fallback if the final model call is rate-limited
       ├─ persist assistant message + sources/tools/records
       ├─ deterministic summary + merged key facts
       └─ return ChatResponse
```

Key files:

| Path | Responsibility |
| --- | --- |
| `app/api/chat/route.ts` | Chat endpoint, persistence, retrieval orchestration, response shaping |
| `lib/agent.ts` | Groq tool loop, prompts, booking, escalation, post-processing, fallbacks |
| `lib/triage.ts` | Emergency and urgent symptom rules |
| `lib/rag.ts` | Tokenizer, synonym expansion, document ranking, source refs, context builder |
| `lib/knowledge.ts` | 24-document knowledge base (15 doctor, 9 business) |
| `lib/db.ts` | JSON persistence, CRUD, settings, public records, stats |
| `lib/seed.ts` | 20 real Chandigarh ESIC doctors, demo orders, and initial settings |
| `lib/scheduling.ts` | Working-day, slot, timezone, availability, next-open-slot, and calendar logic |
| `lib/reminders.ts` | Reminder options, labels, and reminder-time formatting |
| `lib/calendar.ts` | Prefilled Google Calendar event URLs and ICS generation with `VALARM` |
| `lib/google-calendar.ts` | Google OAuth, token refresh, and Calendar event create/update/delete |
| `lib/telegram.ts` | Telegram delivery, status handling, notification log |
| `lib/insights.ts` | Key-fact extraction, summaries, titles, intent labels |
| `components/site/chat-widget.tsx` | Persisted chat UI, mode switching, cards, emergency state |
| `components/dashboard/` | Dashboard shell, grouped Doctor/Business panels, and calendar |
| `lib/types.ts` | Shared data and API types |

## RAG retrieval

The knowledge base contains 24 documents split across Doctor and Business modes, including emergency
protocols, scheduling and fee policies, refund and duplicate-charge policy, escalation SOPs, security
incidents, metrics, and response standards.

Retrieval is deterministic and self-contained:

1. Tokenize the query after lowercasing, punctuation cleanup, and stop-word removal.
2. Expand tokens with a domain synonym map (`typhoid` ↔ fever/urgent, `refund` ↔ duplicate/charge,
   `security` ↔ breach/incident, etc.).
3. Filter documents by mode and score matches:
   - title/tag token: `4.2`
   - body token: `1.15`
   - tag substring: `1.4`
   - multi-word tag phrase: `5.5`
   - exact title in query: `6.0`
   - emergency document on an urgent turn: `+7`
   - typhoid/fever priority on an urgent turn: `+2`
4. Add mode-specific fallback documents when fewer than three passages match.
5. Return up to five passages, their source refs, and a compact context block for the model.

Every answer stores its source refs, so the chat and dashboard can show exactly which documents were
retrieved. Doctor and order records add their own source entries alongside knowledge documents.

## Agent tools and safety behavior

Doctor mode tools:

- `search_doctors` — live directory search with contact details and upcoming slots.
- `get_doctor_schedule` — next slots for one doctor.
- `book_appointment` — validates that the slot is still bookable, then writes the appointment.
- `escalate_case` — creates or reuses an open case for the conversation and attempts Telegram delivery.

Business mode tools:

- `lookup_order` — verifies order facts before discussing a charge or refund.
- `escalate_case` — creates or reuses an owner escalation.

Safety and reliability details:

- Emergency red flags tell the user to call 112 (India) / 911 (US) or go to the nearest emergency
  department, while still providing a local contact and creating an escalation.
- Suspected typhoid and other urgent symptoms cannot receive a self-care-only answer.
- Duplicate escalations are prevented by looking for an open case on the same conversation.
- Business escalations have no doctor id or doctor name; they route to the owner queue.
- The agent never claims a queued Telegram alert was sent.
- Booking replies are only produced after a successful booking tool result; the appointment `icsUrl`
  is patched to the canonical database id after insertion.
- If Groq rate-limits the final response after a successful tool action, a deterministic action
  summary keeps the booking or escalation from turning into an error.
- Chat history is trimmed and the directory snapshot is compact to stay within the free Groq tier's
  tokens-per-minute budget.

## Persistence

All runtime data is stored in `.data/supportsage.json` and `.data/` is gitignored.

- Browser persistence: the widget stores the active conversation id per mode in
  `localStorage` under `supportsage.conversation.doctor` and `supportsage.conversation.business`.
- Server persistence: each conversation stores its full message history, title, summary, key facts,
  sources, tools, linked appointment/case ids, and timestamps.
- Dashboard deletion removes the conversation record; linked operational records remain in their
  queues for audit purposes.
- The database is cached in-process and written atomically via a temporary file.

Reset the demo database:

```bash
# Stop the server first, then:
rm -rf .data          # macOS/Linux
Remove-Item .data -Recurse -Force   # Windows PowerShell
npm run start
```

Deleting `.data/` restores the seed directory (real ESIC doctors plus demo orders) on the next
request. Restart the server after a manual reset because the JSON database is cached per process.

## API reference

All endpoints are server-side and return JSON unless noted. List endpoints wrap their collection.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/chat` | Send a message; creates or continues a persisted conversation |
| `GET` | `/api/dashboard` | Aggregate stats, conversations, records, knowledge, settings |
| `GET` | `/api/conversations?mode=doctor\|business` | Conversation summaries |
| `GET` | `/api/conversations/:id` | Conversation detail with linked records and notifications |
| `DELETE` | `/api/conversations/:id` | Delete a conversation record |
| `GET` | `/api/doctors?q=&city=&specialty=&urgent=true` | Search live directory with next slots |
| `POST` | `/api/doctors` | Add a verified doctor record |
| `DELETE` | `/api/doctors/:id` | Remove a doctor record |
| `GET` | `/api/appointments` | Appointment list |
| `PATCH` | `/api/appointments/:id` | Set status, or change `reminderMinutesBefore` |
| `GET` | `/api/appointments/:id/ics` | Download the calendar file |
| `GET` | `/api/escalations` | Escalation list |
| `PATCH` | `/api/escalations/:id` | Set status to `open`, `acknowledged`, or `resolved` |
| `GET` | `/api/orders` | Order book exposed to Business mode |
| `GET` | `/api/settings` | Public settings and Telegram/Google connection state |
| `PATCH` | `/api/settings` | Save clinic, Telegram, or Google OAuth settings |
| `POST` | `/api/settings/test-telegram` | Send a test alert; returns `400` or `502` on failure |
| `GET` | `/api/integrations/google/start` | Start Google OAuth; redirects to Google consent |
| `GET` | `/api/integrations/google/callback` | OAuth callback; stores tokens server-side |
| `POST` | `/api/integrations/google/disconnect` | Revoke the token and clear the connection |
| `POST` | `/api/integrations/google/test` | Create a 15-minute test event |

### Chat example

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"mode":"doctor","message":"I have had a high fever for four days and think it is typhoid. I am in Sector 20, Chandigarh."}'
```

The response includes:

```json
{
  "conversationId": "conv-...",
  "title": "Urgent · ...",
  "reply": "...",
  "summary": "...",
  "keyInfo": {},
  "sources": [{"id": "kb-typhoid", "title": "Typhoid fever — urgent triage protocol", "type": "emergency"}],
  "tools": ["search_doctors", "escalate_case"],
  "doctors": [],
  "urgent": true,
  "urgencyLevel": "urgent",
  "notificationStatus": "queued"
}
```

`appointment`, `escalation`, `order`, and `emergencyContacts` are omitted when empty; they are
included only when the relevant tool returned a record (or, for contacts, in Doctor mode).

To continue the same conversation, include `conversationId`. Sending a different mode with that id is
rejected with `400`.

### Adding a doctor record

Add doctors from **Dashboard → Directory → Add doctor**, or `POST` the same fields to
`/api/doctors`:

| Field | Required | Notes |
| --- | --- | --- |
| `name`, `specialty`, `qualifications` | yes | Use the clinic's verified credentials |
| `clinic`, `address`, `city`, `phone` | yes | Full visiting address and a reachable number |
| `email` | no | Omit it rather than inventing one |
| `hours`, `fee`, `languages` | no | Enter only details the clinic has confirmed; otherwise use “Call clinic to confirm” / “Ask clinic” |
| `workingDays`, `slotStart`, `slotEnd`, `slotMinutes` | no | Booking window used by the calendar; defaults to weekdays, 30-minute slots |
| `teleconsult`, `urgentCare` | no | Default `false` |

The seeded ESIC records show an **ESIC list** badge and link to the source PDF. Owner-added records
are marked `verified: true` and should come from the clinic directly, not from assumptions.

## Telegram setup

1. Create a bot with [@BotFather](https://t.me/BotFather) and copy the HTTP API token.
2. Send a message to the bot, then use `@userinfobot` or `getUpdates` to obtain the chat id.
3. Save both values in **Dashboard → Integrations** (or set `TELEGRAM_BOT_TOKEN` and
   `TELEGRAM_CHAT_ID`).
4. Press **Send test alert**. A real delivery returns `sent`; an invalid token returns a failed
   notification and a `502` response.

A doctor record can carry its own `telegramChatId`; escalations routed to that doctor try the
doctor's chat first, then fall back to the clinic chat.

Delivery is logged for every attempt:

- `sent` — Telegram accepted the message.
- `queued` — credentials are missing; the full alert is stored locally.
- `failed` — Telegram rejected the message or was unreachable; the error is stored.

## Google Calendar OAuth

Google Calendar sync is optional and off by default. Without credentials, every appointment still
gets:

- A prefilled Google Calendar event URL (`calendarUrl`) with date, time, timezone, patient, reason,
  reference, and clinic address.
- A downloadable ICS route (`/api/appointments/:id/ics`) that works in Google Calendar, Apple
  Calendar, and Outlook. The ICS includes a `VALARM` trigger at the selected reminder lead time.
- `reminderMinutesBefore` and `reminderAt`, both editable from Appointments.

### 1. Create the Google OAuth client

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create or select a project.
2. Enable **Google Calendar API** under **APIs & Services → Library**.
3. Configure **OAuth consent screen** (External is fine for testing). Add your Google account under
   **Test users** while the app is in testing mode.
4. Open **APIs & Services → Credentials → Create credentials → OAuth client ID**.
5. Choose **Web application**.
6. Add these **Authorised redirect URIs** exactly:

   ```text
   http://localhost:3000/api/integrations/google/callback
   http://127.0.0.1:3000/api/integrations/google/callback
   https://your-deployed-domain.com/api/integrations/google/callback
   ```

   Add the last one only when you deploy. The localhost and `127.0.0.1` entries are separate
   strings; Google does not treat them as equivalent.

7. Add **Authorised JavaScript origins** for the site itself (not the callback):

   ```text
   http://localhost:3000
   http://127.0.0.1:3000
   https://your-deployed-domain.com
   ```

8. Copy the **client ID** and **client secret**.

### 2. Connect the calendar

Either add the values to `.env.local` and restart:

```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/google/callback
APP_URL=http://localhost:3000
```

Or paste them into **Dashboard → Integrations → Google Calendar OAuth**, save, and click **Connect
Google Calendar**. The dashboard shows the exact redirect URI to copy into Google Cloud Console.

The OAuth flow requests `openid`, `email`, `profile`, and
`https://www.googleapis.com/auth/calendar.events`. That scope can create, update, and delete events
without granting access to unrelated Google services. Tokens are stored server-side in
`.data/supportsage.json`; the dashboard only receives connection status and the connected email.

### 3. What syncs

- A confirmed booking creates an event on the configured calendar (`primary` by default) with a popup
  reminder matching `reminderMinutesBefore`.
- Changing the reminder patches the Google event.
- Cancelling the appointment deletes the Google event.
- Re-confirming a cancelled appointment creates a new event.
- The dashboard shows **Calendar synced**, **Calendar failed**, or the sync error per appointment.
- Google receives `sendUpdates=none`, so patients are not emailed by Google.
- **Test event** creates a 15-minute event tomorrow at 10:00 in the clinic timezone.

If a Google call fails, the booking or dashboard action still succeeds and the error is stored on
the appointment. The prefilled link and `.ics` download remain available as fallbacks.

The Calendar tab provides a Google-Calendar-style availability view: 7 past days for context, today,
and the next 28 days, with per-doctor open vs booked counts, selected-day detail, and upcoming
reminders. Availability is computed from each doctor's demo working days, slot window, and confirmed
bookings. Past days show history, not bookable slots.

When a requested day or slot is full, `book_appointment` calls `findNextOpenSlot()` and stores the
requested date/time alongside `autoRebooked: true`. The chat and dashboard both disclose the change,
and the new booking still gets a reminder.

## Groq notes

- Model: `openai/gpt-oss-120b` by default.
- The API key is read only on the server in `lib/agent.ts`.
- Free-tier limits observed during development: roughly 8K tokens per minute, 30 requests per minute,
  and 1K requests per day.
- The client retries `429` responses using `Retry-After` and `x-ratelimit-reset-tokens`, with bounded
  waits.
- History is trimmed, the directory snapshot is compact, and completions are capped at 900 tokens to
  fit the free tier.
- Completed actions survive a rate-limited final reply via a deterministic fallback.

For production, use a paid Groq tier or your own model gateway, add request queues, and monitor token
spend per conversation.

## Data and demo records

- 20 real Chandigarh doctors from the ESIC authorised medical attendants list (pages 1–2), covering
  general medicine, general practice, paediatrics, gynaecology, orthopaedics, ophthalmology,
  dermatology, ENT, and general surgery. Source:
  [ESIC Chandigarh AMA list](https://ropunjab.esic.gov.in/attachments/sstfile/0ac6a4939ae0bc729ff1df95d1c84f42.pdf).
- ESIC does not publish consultation hours, fees, languages, or official appointment slots in that
  list. Those values are explicitly labelled as “call clinic to confirm” or demo schedules.
- 4 fictional orders, including one verified duplicate charge (`#1042`, Riya Sharma, $84).
- 24 knowledge documents: 15 Doctor and 9 Business. Policy tabs are scoped by mode.
- Seed data is created on first run; later changes are stored in `.data/supportsage.json`. The seed
  version migrates legacy fictional doctors out of an existing database automatically.

## Production checklist

This is a demo, not a hardened multi-tenant service. Before real use:

- Add authentication and authorization to `/dashboard` and all write APIs.
- Move from local JSON to a transactional database with backups and concurrency control.
- Encrypt Telegram and Google OAuth credentials at rest; do not store them in a plain JSON file.
- Verify the ESIC doctor records against the current ESIC list (the seeded list expired 31-05-2024)
  and replace the fictional order book with real records.
- Add audit-log immutability, retention rules, and PII redaction.
- Add per-user rate limiting and abuse protection to `/api/chat`.
- Restrict the dashboard's Google OAuth connection to trusted owner accounts.
- Add monitoring, structured logs, alerting, and error tracking.
- Add automated tests for triage, retrieval, booking, escalation, and API contracts.
- Review clinical copy with a licensed clinician and local compliance requirements.
- Configure a production Telegram bot and webhook or queue for reliable delivery.

## Scripts

```bash
npm run dev      # Next.js dev server (Webpack)
npm run build    # production build
npm run start    # serve the production build
npm run lint     # ESLint
npx tsc --noEmit # TypeScript check
```

The scripts use Webpack because the original build environment could not load Next's native SWC
binding. On Windows use `npm.cmd` / `npx.cmd` if PowerShell script execution policy blocks the
`.ps1` shims. The build may print `@next/swc-win32-x64-msvc ... is not a valid Win32 application`
warnings and still succeed through WASM; those warnings are environmental, not application errors.

## Troubleshooting

- **Chat says it is not configured** — set `GROQ_API_KEY` in `.env.local` and restart the server.
- **Alerts are queued** — add a bot token and chat id in **Integrations**, then send a test alert.
- **Google shows `redirect_uri_mismatch`** — copy the URI from **Integrations → Google Calendar
  OAuth** into the same OAuth client in Google Cloud Console. `localhost` and `127.0.0.1` are
  different URIs. Changes can take a few minutes to apply.
- **Google says the app is not verified** — while the consent screen is in testing mode, add your
  Google account under **Test users**, or publish the app.
- **Google returns `no_refresh_token`** — remove SupportSage from
  [Google Account permissions](https://myaccount.google.com/permissions) and connect again. The app
  requests offline access with `prompt=consent`.
- **A slot is rejected** — another booking may have taken it, or the time is outside the doctor's
  working hours. Ask Sage for the current slots.
- **The dashboard looks stale** — use **Refresh**; API responses are `no-store`.
- **Need a clean demo** — stop the server, delete `.data/`, and start again.

## Design

The UI keeps the original SupportSage brand: off-white canvas, charcoal ink, muted gray, and the
maroon accent. The dashboard adds operational density without changing the marketing site's
typography, spacing, or tone. The chat widget remains the primary demo surface, with doctor,
appointment, escalation, source, tool, and emergency states rendered inline.
