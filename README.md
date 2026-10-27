# SupportSage AI

An accountable, tool-using support agent for clinics and subscription businesses. Sage retrieves
grounded knowledge, reads live records, takes real actions, escalates to a human, and leaves an
auditable trail in the owner dashboard.

This repository is a working demo, not a mock: chats persist, doctor records are searchable, slots
are checked against booked appointments, appointments generate Google Calendar and `.ics` handoff
links, and every escalation is written to the dashboard with its Telegram delivery status.

> Demo data is fictional. The seeded doctors, orders, phone numbers, and email addresses are for
> demonstration only. Replace them before using this with real patients or customers.

## What works

### Doctor mode

- Urgency triage for emergency red flags, suspected typhoid, fever of 3+ days, severe abdominal
  pain, dehydration, breathing difficulty, chest pain, and similar symptoms.
- Retrieval-augmented answers from a 24-document clinical and operational knowledge base.
- Live doctor search by name, specialty, city, or problem.
- Real doctor cards with clinic, address, phone, email, hours, fee, languages, teleconsult and
  urgent-care flags, and the next available slots.
- Appointment booking with live slot validation, reference generation, Google Calendar link, and
  downloadable `.ics` file.
- Urgent escalation routed to the matched doctor with a Telegram alert attempt and dashboard record.
- A prominent emergency panel with local emergency numbers and the clinic phone.

### Business Owner mode

- Order lookup against the live order book before any charge or refund discussion.
- Duplicate-charge and refund-policy answers grounded in the business knowledge base.
- Escalation to the owner queue with priority, reference, transcript, and Telegram status.
- Order facts, key facts, and summaries stay in Business context; a business escalation never gets
  routed to a doctor.

### Owner dashboard (`/dashboard`)

Seven working sections, all backed by the same JSON database:

1. **Conversations** — ChatGPT-style conversation list, AI summaries, extracted facts, full
   transcripts, linked appointments and cases, sources, tools, and delivery status.
2. **Appointments** — confirmed, completed, and cancelled bookings; status changes; Google Calendar
   and `.ics` handoff.
3. **Escalations** — open, acknowledged, and resolved cases; priority, owner routing, and transcript
   links.
4. **Directory** — searchable doctor records, adding verified records, and removing stale ones.
5. **Orders** — the seeded order book exposed to the business agent.
6. **Integrations** — Groq and Telegram connection status, clinic settings, Telegram setup, test
   alert, and the append-only notification log.
7. **Knowledge** — all 24 knowledge documents with type, mode, and search/filter controls.

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
```

`TELEGRAM_*` values are optional. Without them, appointment and escalation alerts are still logged
as `queued`; the agent explicitly tells the user that the alert is queued rather than claiming it was
delivered.

## Five-minute demo

### 1. Urgent doctor flow

Open the chat, choose **Doctor**, and send:

> I have had a high fever of 103F for four days with a severe headache and abdominal pain. I think
> it might be typhoid. I am in Mumbai and need help today.

Expected behavior:

- An urgent pathway banner and emergency contacts appear.
- Sage retrieves typhoid and fever sources and cites them.
- A real doctor card appears for the urgent/internal-medicine match (normally Dr. Ishaan Verma in
  Mumbai), with phone, clinic address, fee, and live slots.
- An urgent escalation is created and the Telegram alert is queued or sent depending on settings.
- Follow up with a specific slot:

> Yes, please book the 08:00 slot on Wednesday 28 October 2026 with Dr. Ishaan Verma for Anmol
> Rattan. Phone +91 98765 43210, email anmol@example.com. Reason: fever and suspected typhoid
> follow-up. Video consult is fine.

The reply must confirm the booking only after `book_appointment` succeeds. It includes the
appointment reference, date, time, calendar link, and `.ics` link. The dashboard shows the linked
conversation, appointment, and escalation.

### 2. Business refund flow

Switch to **Business Owner** and send:

> Hi, I was charged twice for order #1042. I am Riya Sharma. Please refund the duplicate charge
> today or I will dispute it with my bank.

Expected behavior:

- Sage looks up order `#1042` and states the verified duplicate charge.
- A refund escalation is created with a reference, priority, policy note, and Telegram status.
- The conversation summary and key facts contain the order and customer, but no doctor routing.
- The dashboard **Escalations** tab shows the refund case routed to the owner queue.

### 3. Dashboard walkthrough

Use **Conversations** to inspect the stored transcript, **Appointments** to download the `.ics` or
open Google Calendar, **Escalations** to acknowledge or resolve cases, **Directory** to add a doctor,
and **Integrations** to inspect the notification log.

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
| `lib/seed.ts` | Fictional doctors, orders, and initial settings |
| `lib/scheduling.ts` | Working-day, slot, timezone, and availability logic |
| `lib/calendar.ts` | Google Calendar event URLs and ICS generation |
| `lib/telegram.ts` | Telegram delivery, status handling, notification log |
| `lib/insights.ts` | Key-fact extraction, summaries, titles, intent labels |
| `components/site/chat-widget.tsx` | Persisted chat UI, mode switching, cards, emergency state |
| `components/dashboard/` | Dashboard shell and all seven panels |
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

Deleting `.data/` restores the fictional seed data on the next request. Restart the server after a
manual reset because the JSON database is cached per process.

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
| `PATCH` | `/api/appointments/:id` | Set status to `confirmed`, `completed`, or `cancelled` |
| `GET` | `/api/appointments/:id/ics` | Download the calendar file |
| `GET` | `/api/escalations` | Escalation list |
| `PATCH` | `/api/escalations/:id` | Set status to `open`, `acknowledged`, or `resolved` |
| `GET` | `/api/orders` | Order book exposed to Business mode |
| `GET` | `/api/settings` | Public settings and Telegram connection state |
| `PATCH` | `/api/settings` | Save clinic name, phone, timezone, or Telegram credentials |
| `POST` | `/api/settings/test-telegram` | Send a test alert; returns `400` or `502` on failure |

### Chat example

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"mode":"doctor","message":"I have had a high fever for four days and think it is typhoid. I am in Mumbai."}'
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

### Doctor record example

```bash
curl -X POST http://localhost:3000/api/doctors \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. Asha Rao",
    "specialty": "Internal Medicine",
    "qualifications": "MBBS, MD",
    "clinic": "Harbour Clinic",
    "address": "12 Marine Drive, Mumbai 400002",
    "city": "Mumbai",
    "phone": "+91 90000 12345",
    "email": "asha.rao@example.com",
    "hours": "Mon–Sat, 9:00 AM – 5:00 PM",
    "fee": "₹800 consultation",
    "languages": "English, Hindi",
    "slotStart": "09:00",
    "slotEnd": "17:00",
    "slotMinutes": 30,
    "workingDays": [1, 2, 3, 4, 5, 6],
    "teleconsult": true,
    "urgentCare": true
  }'
```

Owner-added records are marked `verified: true`; seeded records are labelled `DEMO RECORD`.

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

## Google Calendar handoff

Each appointment stores:

- A prefilled Google Calendar event URL (`calendarUrl`) with date, time, timezone, patient, reason,
  reference, and clinic address.
- A downloadable ICS route (`/api/appointments/:id/ics`) that works in Google Calendar, Apple
  Calendar, and Outlook.

**Caveat:** full two-way Google Calendar OAuth sync is not implemented because OAuth credentials were
not provided. The current handoff is intentionally link/download based and requires no credentials.

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

- 9 fictional doctors across Mumbai, Delhi, Bengaluru, Chennai, Hyderabad, and Pune.
- 4 fictional orders, including one verified duplicate charge (`#1042`, Riya Sharma, $84).
- 24 knowledge documents: 15 Doctor and 9 Business.
- Seed data is created on first run; later changes are stored in `.data/supportsage.json`.

## Production checklist

This is a demo, not a hardened multi-tenant service. Before real use:

- Add authentication and authorization to `/dashboard` and all write APIs.
- Move from local JSON to a transactional database with backups and concurrency control.
- Encrypt Telegram credentials at rest; do not store them in a plain JSON file.
- Replace fictional doctor, order, and clinic data with verified records.
- Add audit-log immutability, retention rules, and PII redaction.
- Add per-user rate limiting and abuse protection to `/api/chat`.
- Implement Google Calendar OAuth if two-way sync is required.
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
- **A slot is rejected** — another booking may have taken it, or the time is outside the doctor's
  working hours. Ask Sage for the current slots.
- **The dashboard looks stale** — use **Refresh**; API responses are `no-store`.
- **Need a clean demo** — stop the server, delete `.data/`, and start again.

## Design

The UI keeps the original SupportSage brand: off-white canvas, charcoal ink, muted gray, and the
maroon accent. The dashboard adds operational density without changing the marketing site's
typography, spacing, or tone. The chat widget remains the primary demo surface, with doctor,
appointment, escalation, source, tool, and emergency states rendered inline.
