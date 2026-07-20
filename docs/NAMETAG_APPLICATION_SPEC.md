# NameTag Application Spec

**Status:** Build Week MVP, July 2026
**Product line:** Networking, without the pressure.

NameTag is an event-first networking application. It turns one unfamiliar event into a private research workspace, a focused public QR card, and a follow-up queue that preserves the conversation context.

## Product Outcome

The product should move a user from:

> “I am about to walk into a room I do not understand, and I will probably lose the useful connections afterward.”

to:

> “I understand why this event matters to me, I have a few useful questions, I can share one clean card, and I know my next follow-up.”

## In Scope

1. **Account and workspace**
   - Email/password, magic-link, and Google OAuth entry points.
   - A signed-in owner's profile, links, events, notes, cards, contacts, and follow-up state persist in an owner-only Supabase workspace.
   - A no-login fictional sample event lets a reviewer enter the product immediately.
2. **Event research**
   - The user gives an event URL, free-form description, or screenshot.
   - NameTag produces a structured, source-grounded brief: what the event is, useful topics, confirmed speakers only when supported by the source, people or roles to meet, and questions to ask.
   - A research chat accepts follow-up questions and carries the same event context forward.
3. **Public links and QR**
   - The owner stores optional links once in Settings.
   - Per event, the owner selects which links become public. An AI recommendation is visible to the owner, who can override it.
   - The public card contains only owner-written public profile details and the selected links. It does not render private event research, private notes, hidden links, or generated pitch copy.
4. **Connection and follow-up**
   - A scanner can save the public card and deliberately opt in to share a name, contact route, and optional conversation note.
   - The owner receives the connection in the event's debrief, can add private notes or promises, edit the generated follow-up, and move it through `to send`, `sent`, and `done`.

## Explicit Non-Goals

- No attendee-directory or social graph.
- No automatic contact scraping or auto-filled identity from a QR scan.
- No automatic message sending.
- No social-account ownership verification, calendar sync, payment, or full CRM.
- No claim that NameTag knows attendees or speakers when an event source does not contain them.

## Primary User Journey

| Moment | User action | Product response | Completion signal |
| --- | --- | --- | --- |
| Before | Adds an event source and selects one goal | Builds a grounded room brief and research chat | User understands the event and saves a useful question |
| During | Selects public links and opens QR | Publishes a link-first public card | Scanner can open/save the card on a second device |
| Connect | Scanner chooses to share details | Captures consent and a small conversation memory | Owner sees a new connection in the correct event |
| After | Reviews the debrief | Produces an editable, context-aware follow-up | Owner marks the follow-up sent or done |

## Information Architecture

The app has two intentionally separate surfaces.

### Owner application

- **Events:** current, upcoming, and recent rooms.
- **Research:** event summary, source confidence, useful questions, speaker facts, and follow-up chat.
- **Links:** private vault and per-room public selection.
- **QR:** a single, high-contrast share surface.
- **Follow up:** people, notes, promises, draft, status, and priority.
- **Settings:** profile, optional public bio, optional private tailoring context, and saved links.

### Scanner public card

- Owner name, owner-written headline/bio if present, and the event-selected public links.
- Save/copy/download options so the card persists after leaving the camera scanner.
- A collapsed, opt-in-only connection form.
- No owner dashboard UI, AI rationale, hidden links, research, private profile context, or other scanner records.

## Product Rules

1. A source may inform research, but uncertain facts stay uncertain. Do not invent named speakers, organizers, attendees, organizations, or agenda items.
2. The public card is link-first. AI-generated introductions are not rendered to scanners.
3. Selecting a link is an owner decision. AI recommendation is advice, not a lock.
4. A scanner connection is a two-way opt-in. Submission needs an explicit consent checkbox and the server records its timestamp.
5. A scanner never chooses the target event ID. The server resolves it from the published QR card.
6. Follow-up is always human-controlled. AI proposes a draft; the owner can edit, copy, defer, mark sent, or mark done.

## Acceptance Criteria

- A reviewer can enter the sample event without an account and reach Research, Links, QR, and Follow up.
- A signed-in owner can edit profile/links on one device and have the private workspace available on another signed-in device.
- A QR card from a deployed environment opens on another device and contains no hidden/private link data.
- An opted-in scanner connection appears only in the owning card's event queue.
- An AI outage or thin event webpage leaves the app usable through deterministic fallback and clear source limitations.

## Quality Bar For Build Week

The core proof is not a static card. It is visible context continuity:

```text
event source -> grounded research -> owner-selected public links -> QR connection -> event-specific follow-up
```

Each arrow should be visible in the product and explainable in the demo.
