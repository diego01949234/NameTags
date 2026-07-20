import type { Contact, EventDebriefRequest, EventDebriefResult } from "@/lib/types";
import { sanitizeDebriefRequest } from "@/lib/server/ai-input";
import { rateLimitRequest } from "@/lib/server/request-rate-limit";

const maxContacts = 40;
const maxNotes = 20;

export async function POST(request: Request) {
  const limit = rateLimitRequest(request, "debrief", { maxRequests: 5, windowMs: 10 * 60 * 1000 });
  if (!limit.allowed) {
    return Response.json(
      { error: "You have organized several follow-up queues. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  let rawPayload: unknown;
  try {
    rawPayload = await request.json();
  } catch {
    return Response.json({ error: "Add at least one person before organizing this event." }, { status: 400 });
  }
  const sanitizedPayload = sanitizeDebriefRequest(rawPayload);
  if (!sanitizedPayload) {
    return Response.json({ error: "Add at least one person before organizing this event." }, { status: 400 });
  }
  const contacts = sanitizedPayload.contacts.slice(0, maxContacts);
  const notes = sanitizedPayload.notes.slice(0, maxNotes);

  if (!sanitizedPayload.event.name || contacts.length === 0) {
    return Response.json(
      { error: "Add at least one person before organizing this event." },
      { status: 400 }
    );
  }

  const boundedPayload = { ...sanitizedPayload, contacts, notes };

  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ mode: "mock", result: buildMockDebrief(boundedPayload) });
  }

  try {
    const result = await organizeWithOpenAI(boundedPayload);
    return Response.json({ mode: "openai", result });
  } catch (error) {
    console.error("Event debrief failed, using mock fallback", error);
    return Response.json({ mode: "mock_fallback", result: buildMockDebrief(boundedPayload) });
  }
}

async function organizeWithOpenAI(payload: EventDebriefRequest): Promise<EventDebriefResult> {
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["summary", "actionPlan", "contacts"],
    properties: {
      summary: { type: "string", maxLength: 420 },
      actionPlan: {
        type: "array",
        minItems: 2,
        maxItems: 4,
        items: { type: "string", maxLength: 180 }
      },
      contacts: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["contactId", "priority", "followUpDraft", "followUpReason", "followUpWindow"],
          properties: {
            contactId: { type: "string" },
            priority: { type: "string", enum: ["high", "medium", "low"] },
            followUpDraft: { type: "string", maxLength: 700 },
            followUpReason: { type: "string", maxLength: 180 },
            followUpWindow: { type: "string", enum: ["today", "within_48_hours", "this_week"] }
          }
        }
      }
    }
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-5.6-terra",
      reasoning: { effort: process.env.OPENAI_REASONING_EFFORT ?? "high" },
      input: [
        {
          role: "system",
          content:
            "You are NameTag's event debrief copilot. Turn a small, messy post-event contact list and private notes into a calm, actionable follow-up queue. Work privately by separating explicit conversation facts, concrete promises, and recommended next actions before you draft. Do not reveal a chain of thought. Use only the supplied contacts, promises, notes, event name, goal, focus, and networkingRole. Never invent what someone said, their title, an agreement, a timeline, or a relationship. Match the draft to networkingRole: students can ask a small specific question, builders can refer to feedback or a demo, career movers can reference relevant work, community attendees can carry forward a shared moment, and explorers can keep the note simple and warm. Keep explicit promises and meaningful requests at high priority; use medium for worthwhile but less urgent conversations; use low for light or incomplete connections. Give every supplied contact exactly one recommendation, a short factual reason, a time window, and a warm concise first-person draft that is ready to edit. Drafts should sound like one person writing another person: use one concrete detail only when it reads naturally, never repeat a scanner's self-introduction verbatim, and do not use the phrases 'I remembered:' or 'Here is the NameTag link we discussed.' A contact share with no conversation detail deserves a short warm message, not invented context. Drafts must not claim the user will do something unless a supplied promise says so. The summary should describe the queue, not give generic networking advice. Return only JSON matching the schema."
        },
        {
          role: "user",
          content: JSON.stringify(payload)
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "nametag_event_debrief",
          strict: true,
          schema
        }
      }
    })
  });

  if (!response.ok) throw new Error(`OpenAI debrief returned ${response.status}`);

  const data = await response.json();
  const outputText =
    data.output_text ??
    data.output
      ?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content ?? [])
      .map((content: { text?: string }) => content.text)
      .filter(Boolean)
      .join("");

  if (!outputText) throw new Error("OpenAI debrief did not include JSON text");
  return JSON.parse(outputText) as EventDebriefResult;
}

function buildMockDebrief(payload: EventDebriefRequest): EventDebriefResult {
  const contacts = payload.contacts.map((contact) => organizeContact(contact, payload.event.name));
  const highCount = contacts.filter((contact) => contact.priority === "high").length;
  const mediumCount = contacts.filter((contact) => contact.priority === "medium").length;
  const notesCount = payload.notes.length;
  const summary = `${contacts.length} ${contacts.length === 1 ? "connection" : "connections"} from ${payload.event.name}: ${highCount} need${highCount === 1 ? "s" : ""} attention today${mediumCount ? `, ${mediumCount} can follow within 48 hours` : ""}.`;

  return {
    summary,
    actionPlan: [
      highCount
        ? `Send the ${highCount} high-priority follow-up${highCount === 1 ? "" : "s"} while the conversation is still fresh.`
        : "Pick one conversation to follow up on today, even if the message is short.",
      notesCount
        ? `Use the ${notesCount} private event note${notesCount === 1 ? "" : "s"} to add one specific detail where it is relevant.`
        : "Add one detail from each meaningful conversation before you lose the context.",
      "Mark a message sent when you leave the app, then keep only real next steps in the queue."
    ],
    contacts
  };
}

function organizeContact(contact: Contact, eventName: string): EventDebriefResult["contacts"][number] {
  const note = contact.note?.trim() || "";
  const promise = contact.promise?.trim();
  const signal = `${note} ${promise ?? ""}`.toLowerCase();
  const hasStrongSignal = /asked|requested|intro|introduction|feedback|demo|prototype|meeting|send|connect/i.test(signal);
  const priority = promise || hasStrongSignal ? "high" : contact.contact ? "medium" : "low";
  const followUpWindow =
    priority === "high" ? "today" : priority === "medium" ? "within_48_hours" : "this_week";
  const firstName = contact.name.trim().split(/\s+/)[0] || "there";
  const promiseLine = promise
    ? ` I'll ${lowercaseFirst(trimSentence(promise))}.`
    : " I'd love to stay in touch.";

  return {
    contactId: contact.id,
    priority,
    followUpWindow,
    followUpReason: promise
      ? `You recorded a clear next step: ${promise}.`
      : hasStrongSignal
        ? "Your notes point to a concrete request or useful next conversation."
        : contact.contact
          ? "You have a direct way to reconnect, but no urgent promise was recorded."
          : "The connection is worth keeping, but you do not yet have a clear next step.",
    followUpDraft: `Hi ${firstName}, it was great meeting you at ${eventName}.${buildMockContextLine(note)}${promiseLine}`
  };
}

function buildMockContextLine(note: string) {
  const cleaned = trimSentence(note.trim());
  if (!cleaned || /shared details through the event card|connected through .*public card/i.test(cleaned)) {
    return "";
  }

  const organization = cleaned.match(/\bfrom\s+(.+)$/i)?.[1]?.trim();
  if (organization) return ` I enjoyed hearing about your work with ${organization}.`;

  return " Thanks for sharing a little about what you're working on.";
}

function lowercaseFirst(value: string) {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function trimSentence(value: string) {
  return value.replace(/[.!?]+$/, "");
}
