# NameTags Devpost Submission Pack

Everything below is written in English as a submission outline. Before posting,
personally rewrite the **Inspiration**, **Challenges**, **Accomplishments**, and
**What We Learned** sections in the project owner's real voice. The official
Build Week guidance explicitly warns against submitting AI-written project
descriptions unchanged. Replace only the values marked `PENDING` after that
personal pass.

## Submission Identity

- **Project:** NameTags
- **Recommended track:** Apps for Your Life
- **Tagline:** Networking, without the pressure.
- **One-line pitch:** A private, attendee-owned event copilot that turns event anxiety into one real next step.
- **Live app:** https://nametags-network.vercel.app
- **Repository:** `PENDING — add the public GitHub URL after publishing.`
- **Demo video:** `PENDING — add the public YouTube URL after upload.`
- **Primary Codex feedback session ID:** `PENDING — generate through /feedback in the primary development session.`

## Short Description

NameTags helps people enter unfamiliar events with less pressure. It researches an event from a link, description, or screenshot; gives the attendee a private plan and research chat; turns selected links into one event-specific QR card; and converts consented connections into editable follow-ups.

## Inspiration

I came to New York for a summer internship and was surprised by how social the city felt. I was suddenly seeing meetups, founder gatherings, and networking events everywhere. I did not understand how people could walk into a room full of strangers, already know what to talk about, and exchange the right information so naturally.

For me, as a non-native English speaker in an unfamiliar city, the pressure was not only "networking." Before each event, I was switching between event pages, LinkedIn, notes, and different contact apps while commuting, trying to understand what the room was about and turn that context into a natural question. At the event, I did not want to hand every person the same generic profile. Afterward, business cards and half-remembered promises became a follow-up task I kept postponing.

I built NameTags to make that whole sequence calmer: understand the room before entering, share one intentional QR card during it, and turn a real conversation into one clear next step afterward. Colleagues tried early versions, and their feedback pushed the product away from long generic advice toward a faster research conversation, a link-first room pass, and a simpler follow-up queue.

## What It Does

NameTags is an event-first, private workspace rather than a permanent public profile. An attendee adds their identity and links once, then creates a distinct room pass for each event.

**Before the event:** The attendee pastes an event URL, event name/date, rough description, or screenshot. NameTags produces a source-grounded brief and supports a short research conversation about what the event is, what is known, and what to ask.

**During the event:** The attendee decides which links are appropriate for that room and publishes a QR room pass. A scanner sees only the selected public links. They can save the card without giving anything back, or explicitly opt in to share their own contact details and a conversation note.

**After the event:** The same event context follows every consented connection into a private follow-up queue. NameTags organizes notes and promises, recommends a priority, and prepares an editable draft. The owner chooses whether to copy it, mark it sent, or mark it done. NameTags never sends outreach automatically.

## How It Works

1. The owner creates an event and starts with a public source or short description.
2. Server-side research extracts grounded event context. If a public event page is too thin, the product asks for pasted context or uses a public web lookup instead of inventing speaker or attendee details.
3. GPT-5.6 tailors the resulting brief and research chat to the attendee's private role and goal. Public research and private tailoring are separate calls.
4. The owner chooses event-specific public links. Hidden links never enter the QR card payload.
5. The public QR card uses an opaque random card ID. Scanner contact submission derives its event from the published card server-side and requires explicit consent.
6. The private follow-up queue combines the event, note, promise, and contact state into a human-reviewed next action.

## How We Built It

- **Frontend:** Next.js 16, TypeScript, React, Tailwind CSS, and Lucide icons.
- **QR and public card:** `qrcode.react`, dynamic public card routes, and a server-side publication path.
- **Accounts and persistence:** Supabase Auth, Postgres, a private `user_workspaces` record, and owner-only Row Level Security policies.
- **Consent-based contact capture:** Server routes create public cards and contacts. The browser never receives the server secret or another scanner's contacts.
- **AI:** OpenAI Responses API with GPT-5.6 for event research, screenshot understanding, interactive research chat, link recommendations, and follow-up synthesis.
- **Reliability:** Bounded inputs, source links for web-backed research, deterministic fallbacks, no fabricated speakers from thin sources, and explicit loading/empty/error states.
- **Video:** Remotion-based motion titles explain the before/during/after system without using fabricated product footage. The live product evidence is recorded separately on real devices.

## How GPT-5.6 Is Used

GPT-5.6 is not used as a generic chat wrapper. It is called server-side at the points where contextual reasoning matters:

- synthesize a structured, source-grounded event brief from a URL, description, event search, or screenshot;
- answer a precise research question about the room using fresh public sources, then tailor the practical advice using the attendee's private goal;
- recommend public links for a specific room and explain that recommendation to the owner only;
- organize consented contacts, notes, promises, priority, and an editable follow-up draft.

Fast, attendee-facing research defaults to medium reasoning so the person can act while commuting. The multi-contact follow-up queue defaults to high reasoning because it combines more private context. The app has a deterministic fallback if an OpenAI key, provider, or source page is unavailable.

## How Codex Was Used

I used Codex as a build partner to turn my own New York networking pain point into a working application. It accelerated implementation and iteration across the actual codebase: the mobile-first event flow, account-first workspace, Supabase RLS integration, server-side public QR boundaries, explicit scanner consent, contextual follow-up queue, UI refinement, motion design, verification, README, and this submission package.

The git history and Build Week record are the evidence trail. This project does not claim fabricated users, metrics, or tests.

## Challenges We Ran Into

**Event information is often incomplete.** Many event websites are JavaScript-heavy and expose too little useful HTML to a simple request. NameTags detects thin content, uses available metadata and public research where appropriate, shows sources, and declines to invent names that are not supported.

**A QR code can accidentally become a privacy leak.** We separated owner intelligence from scanner experience. Private research, hidden links, notes, and follow-up context do not enter the scanner payload; the owner previews the public card before publishing.

**A connection is not a follow-up.** A QR scan alone is not enough. The scanner must intentionally share a contact route and consent. The owner must review the draft and explicitly mark a message as sent or done.

## Accomplishments We Are Proud Of

- Turning a personal, non-native-speaker networking problem into a coherent before / during / after loop instead of three disconnected AI features.
- Iterating early flows with colleague feedback until the product centered on quick research, an intentional link-first room pass, and a follow-up queue that makes the next action obvious.
- A no-login fictional sample event so a reviewer can explore the core journey immediately without shared credentials or personal data.
- A visible owner/scanner privacy boundary: one event-specific QR card contains only selected public links.
- A practical follow-up system that carries a conversation's context forward, but keeps the human in control of outreach.
- A real Supabase-backed account and consent architecture alongside deterministic local fallbacks for a reliable demo.

## What I Learned

The useful AI moment is not a long networking essay. It is a small, timely answer that helps someone understand the room or choose the next sentence when they are already on the subway or outside the venue. I also learned that privacy must be a product surface: the owner needs to see exactly what a scanner will see, and the scanner needs a real choice about whether to share anything back.

## What's Next

- Run a small pilot with first-time founder meetups, hackathons, and student career events.
- Add a shared production rate-limit store, spam protection, audit logs, and fuller consent/data-deletion controls.
- Improve source quality evaluation and give attendees a lightweight way to rate research and follow-up usefulness.
- Add reliable reminders and calendar-aware timing only after the core follow-up loop has been validated.

## Reviewer Test Path

1. Open https://nametags-network.vercel.app.
2. Select **Run the 60-second demo** for a no-login, fictional Founder Meetup workspace.
3. Open **Research** and ask a specific question about the room.
4. Go to **Links** and choose the public surfaces for the card; inspect the scanner preview.
5. Go to **QR**, then open or scan the public card in another browser/device. Confirm that only selected public links are visible.
6. Use **Share my details** and the explicit consent control.
7. Return to the owner app and inspect **Follow up** for the event-specific connection, note, and editable next action.

For a full cross-device proof, use the deployed environment with Supabase server variables configured. Do not claim the two-device test complete until it has been performed and recorded in [`BUILD_WEEK.md`](../BUILD_WEEK.md).

## Three-Minute Demo Video Script

| Time | What to show | Voiceover point |
| --- | --- | --- |
| 0:00-0:10 | Motion title: “Networking should not begin with panic.” | “I came to New York for a summer internship. As a non-native English speaker in a new city, I kept arriving at events excited but unprepared.” |
| 0:10-0:40 | Real mobile recording: add event source and Research | “I can paste an invite, screenshot, or rough note. NameTags helps me understand this particular room and is clear about what the sources do not confirm.” |
| 0:40-1:00 | Research chat | “Instead of generic networking advice, I ask the exact question I have while I am on the way there.” |
| 1:00-1:25 | Links review and scanner preview | “For this event, I choose the links that should travel. Private links and the AI reasoning stay in my workspace.” |
| 1:25-1:55 | QR on owner device; public card on scanner device | “One QR opens a clean, link-first room pass. Saving it is easy; sharing contact details back is a separate, explicit choice.” |
| 1:55-2:22 | Scanner consent and owner Follow up | “When someone opts in, NameTags attaches that connection to this event and keeps the conversation note with it.” |
| 2:22-2:45 | Edit/copy/mark follow-up | “GPT-5.6 organizes the next message, but I remain in control: I edit, copy, mark sent, then done.” |
| 2:45-3:00 | Architecture or source montage | “Codex helped build the complete context path: event source to research to QR consent to follow-up. NameTags is networking without the pressure.” |

## Final Devpost Checklist

- [ ] Select **Apps for Your Life**.
- [ ] Add the live app URL above.
- [ ] Add the public GitHub repository URL and confirm the MIT `LICENSE` is visible.
- [ ] Upload a public demo video under the event's allowed duration.
- [ ] Paste the GPT-5.6 and Codex sections above.
- [ ] Run `/feedback` in the main Codex development thread and paste the real session ID.
- [ ] Complete and record one real two-device QR -> consent -> follow-up test.
- [ ] Do not add invented traction, metrics, or user quotes.
