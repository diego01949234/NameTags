# NameTag Build Week

## Product claim

**NameTag turns event anxiety into one real next step.**

It is a mobile-first companion for people who feel underprepared or anxious before networking. The product helps them understand the room, ask a useful question, share focused public links, and follow through on the conversations that mattered.

## This week's build scope

The Build Week version is intentionally a single end-to-end loop:

1. Start a real event research flow from a URL, a short event-name/date search, a description, or a screenshot, or use a clearly labelled fictional sample event.
2. Read the grounded room brief and ask follow-up questions about speakers, agenda, audience, and useful questions to ask.
3. Select the public links that should travel with one event-specific QR card.
4. Let a scanner deliberately save the card and opt in to share their own contact details and a conversation note.
5. Turn the connection, private note, and promise into an editable follow-up with a visible `to send -> sent -> done` state.

## What is new for Build Week

- Account-first entry: Google OAuth or email magic link; the account name seeds the first-run profile.
- Owner workspaces automatically save to Supabase after each edit and are protected by owner-only Row Level Security.
- A one-tap, no-login fictional sample event so a reviewer can experience the complete product loop before creating an account.
- Grounded event research from a URL, description, or screenshot. Short natural-language event searches use GPT-5.6 web search with visible source links, and thin SPA event pages automatically fall back to that lookup instead of making the attendee re-enter the event.
- Factual research-chat questions can refresh public web research, then a separate private tailoring step turns those facts into a role- and goal-specific networking move. The web lookup never receives profile, CV, LinkedIn, or private background content.
- The same event ID connects research, owner link choices, the public room pass, scanner consent, and the follow-up queue. The server derives a scanner connection's event ID from the published room pass rather than trusting a browser-supplied value.
- QR contact capture now requires explicit consent on the client **and** server, with a server-recorded consent timestamp.
- The follow-up view prioritizes the next real action, shows recommended timing, lets the owner edit/copy a draft, mark it sent, and mark it done.

## Where GPT-5.6 is used

The server-side OpenAI Responses API calls use `OPENAI_MODEL` (default `gpt-5.6-terra`) to generate:

- event prep briefs and suggested link reasoning in [`app/api/generate/route.ts`](./app/api/generate/route.ts)
- grounded follow-up research chat in [`app/api/research-chat/route.ts`](./app/api/research-chat/route.ts)
- prioritization and editable follow-up drafts in [`app/api/debrief/route.ts`](./app/api/debrief/route.ts)

Short event-name/date searches use `OPENAI_RESEARCH_MODEL` (default `gpt-5.6`) with the Responses API `web_search` tool in [`app/api/brief/route.ts`](./app/api/brief/route.ts). These research calls default to `OPENAI_REASONING_EFFORT=high`: the model privately resolves the event identity, checks material facts against strong sources, and returns a compact sourced read rather than a chain-of-thought. Uploaded screenshots use `input_image` in [`app/api/event-image/route.ts`](./app/api/event-image/route.ts); a recognizable title then triggers the same live lookup. Factual chat questions use the same public-only lookup in [`app/api/research-chat/route.ts`](./app/api/research-chat/route.ts), then a separate model call uses the private profile only to tailor advice. Each web-backed answer stores up to three visible source links.

Every AI route has a deterministic fallback so the core flow remains available if the model or event-page fetch is unavailable. Event research does not invent named speakers or attendees when the source does not support them.

## Where Codex is used

Codex was used in this repository to implement and iterate on the mobile-first application flow, Supabase/RLS integration, public QR card boundaries, consent capture, interaction copy, and the Build Week demo route. The source files and this document are the implementation record; no fake test or traction result is claimed.

## Privacy boundaries

- Public cards only contain event-selected public links. Hidden links never enter the public-card payload.
- Scanner contact sharing is optional. The server rejects submissions without an explicit consent flag and stores the consent timestamp.
- The server derives the connection's event ID from the published QR card, so a scanner cannot place their contact in an arbitrary owner's event queue.
- Private notes, prep context, event research chat, and follow-up queues are never rendered on the public QR page.
- QR card IDs are generated as opaque random IDs. Owner contact polling additionally requires a per-card sync key.
- No message is sent automatically. The owner reviews and edits the draft, then deliberately copies/opens it and marks its status.

## Required final validation

Before submitting, run one real two-device proof:

1. A creates a card from the demo or a real event.
2. B scans the deployed QR on a separate phone.
3. B saves the card, opts in to share a contact and a note.
4. A sees the connection in the follow-up queue, organizes the debrief, copies the draft, marks it sent, then marks it done.

Record the actual result here after the test. Do not replace it with invented numbers.

## Deployment configuration

- Supabase schema: run [`supabase/schema.sql`](./supabase/schema.sql) again after this update to add `contacts.consented_at` if it is not already present.
- Vercel Production: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `OPENAI_API_KEY`. `OPENAI_RESEARCH_MODEL=gpt-5.6`, `OPENAI_VISION_MODEL=gpt-5.6`, and `OPENAI_REASONING_EFFORT=high` are optional because those are the quality-first defaults.
- Supabase Auth: configure Site URL and Google OAuth before relying on the Google entry point. Email magic links remain available as the fallback.
