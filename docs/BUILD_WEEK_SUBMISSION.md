# NameTag Build Week Submission Kit

## Submission Identity

- **Project:** NameTag
- **Track:** Apps for Your Life
- **One-line pitch:** NameTag turns event anxiety into one real next step.
- **Product line:** Networking, without the pressure.
- **Live app:** https://nametag-networking.vercel.app
- **Repository:** Add the public repository URL after pushing this project.
- **Demo video:** Add a public YouTube URL after recording.
- **Codex feedback session:** Add the required `/feedback` session ID before submitting.

## Devpost Short Description

NameTag is a mobile-first event companion for people who find networking stressful or messy. Paste an event URL, description, or screenshot to understand the room and ask useful questions. Choose the few public links that belong on one QR card. When someone scans, they can save the card or explicitly opt in to share their own contact and conversation note. After the event, NameTag keeps that context together and drafts a human-reviewed follow-up.

## Devpost Long Description

Networking breaks before, during, and after the event. Before the event, you may be rushing there without knowing the agenda, speakers, or what to ask. During it, swapping a different link or contact method with everyone is awkward. Afterward, names and notes decay into a vague promise to follow up.

NameTag makes that sequence one continuous flow. A user starts with an event URL, rough description, or screenshot. GPT-5.6 creates a source-grounded room brief, makes missing details visible, and supports a short research conversation. The owner then chooses the public links that should appear on one event-specific QR card. The scanner sees only that link-first public card. They may save it without sharing anything back, or deliberately opt in to share a contact route and an optional conversation note.

The same event context follows the connection into the owner's private follow-up queue. GPT-5.6 helps prioritize and draft the next message, but the owner edits, copies, and marks it complete. NameTag never invents speakers from thin sources, never exposes hidden links on the public card, and never auto-sends outreach.

## How GPT-5.6 Is Used

- Structured event research from supplied URL/text/screenshot context.
- Context-aware research chat for questions about the room.
- Owner-only link recommendation and rationale.
- Priority ranking and editable follow-up drafts.

The server uses the OpenAI Responses API with `gpt-5.6-terra` by default. Deterministic fallbacks preserve the demo when an API key, provider, or event page is unavailable.

## How Codex Is Used

Codex was used to build and iterate on the application: mobile-first flow, owner/scanner privacy split, Supabase Auth and RLS workspace sync, public QR publishing, consent capture, server-derived event association, follow-up workflow, visual polish, README, and this submission package. The code and dated git history are the evidence trail; this project does not claim fabricated users, metrics, or tests.

## Three-Minute Video Script

| Time | What to show | Voiceover point |
| --- | --- | --- |
| 0:00-0:15 | Event entrance or app home | “Networking anxiety starts before the room. I am rushing in and do not know what I should understand or say.” |
| 0:15-0:45 | Add event source, then Research | “I paste the invite or screenshot. NameTag gives a grounded brief and says what it does not know instead of inventing speakers.” |
| 0:45-1:05 | Research chat and saved questions | “I can ask a specific question and get useful questions for this particular room, not a generic networking speech.” |
| 1:05-1:25 | Links review | “I choose the links that travel with this event. The owner sees why they were suggested, but scanners never see private context.” |
| 1:25-1:55 | QR on one device, public card on another | “One QR opens a clean link-first card. Saving the card is frictionless; sharing a contact back is a separate, explicit choice.” |
| 1:55-2:20 | Scanner consent form, then owner Follow up | “When they opt in, NameTag attaches the connection to this exact event and keeps the conversation note with it.” |
| 2:20-2:42 | Edit/copy/mark follow-up | “GPT-5.6 drafts the next message, but I remain in control: edit, copy, mark sent, then done.” |
| 2:42-3:00 | Architecture or code montage | “Codex built and iterated the full context path: event source to research to QR consent to follow-up. This is networking without the pressure.” |

## Reviewer Test Path

1. Open the live app.
2. Select **Explore a sample event** for a no-login evaluation path.
3. Visit **Research**, ask a follow-up question, then go to **Links** and **QR**.
4. Open the QR URL in another browser/device. Confirm it contains public links only.
5. Use the scanner's **Share my details** control and explicit consent checkbox.
6. Return to the owner application and inspect **Follow up** for the event-specific connection and draft.

For a full cross-device proof, use the deployed environment with Supabase server variables configured. Do not claim the two-device test complete until it has been performed and recorded in [`BUILD_WEEK.md`](../BUILD_WEEK.md).

## Final Submission Checklist

- [ ] Choose **Apps for Your Life** on Devpost.
- [ ] Add public app URL.
- [ ] Push a public repository with this README and MIT license, or share a private repository with the required Build Week reviewers.
- [ ] Record a public YouTube video under three minutes with audio.
- [ ] State how both Codex and GPT-5.6 were used.
- [ ] Add the primary Codex `/feedback` session ID.
- [ ] Complete and record one real two-device QR → consent → follow-up test.
- [ ] Do not add invented traction, metrics, or user quotes.
