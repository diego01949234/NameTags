import type { ResearchChatRequest, ResearchChatResult } from "@/lib/types";
import { sanitizeResearchRequest } from "@/lib/server/ai-input";
import { rateLimitRequest } from "@/lib/server/request-rate-limit";

const maxQuestionLength = 600;

export async function POST(request: Request) {
  const limit = rateLimitRequest(request, "research-chat", {
    maxRequests: 12,
    windowMs: 10 * 60 * 1000
  });
  if (!limit.allowed) {
    return Response.json(
      { error: "Give the research copilot a moment before asking another question." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  let rawPayload: unknown;
  try {
    rawPayload = await request.json();
  } catch {
    return Response.json({ error: "Ask one short question about this event." }, { status: 400 });
  }
  const boundedPayload = sanitizeResearchRequest(rawPayload);
  if (!boundedPayload) {
    return Response.json({ error: "Ask one short question about this event." }, { status: 400 });
  }
  const question = boundedPayload.question;

  if (!question || question.length > maxQuestionLength) {
    return Response.json({ error: "Ask one short question about this event." }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ mode: "mock", result: mockResearchAnswer(boundedPayload, question) });
  }

  try {
    const result = await answerWithOpenAI(boundedPayload, question);
    return Response.json({ mode: "openai", result });
  } catch (error) {
    console.error("Event research chat failed, using mock fallback", error);
    return Response.json({ mode: "mock_fallback", result: mockResearchAnswer(boundedPayload, question) });
  }
}

async function answerWithOpenAI(
  payload: ResearchChatRequest,
  question: string
): Promise<ResearchChatResult> {
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["answer", "suggestedQuestions"],
    properties: {
      answer: { type: "string", maxLength: 900 },
      suggestedQuestions: {
        type: "array",
        minItems: 2,
        maxItems: 3,
        items: { type: "string", maxLength: 100 }
      }
    }
  };
  const source = (payload.event.researchContext || payload.event.urlOrDescription).slice(0, 7000);
  const history = payload.history.slice(-6);

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + process.env.OPENAI_API_KEY
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-5.6-terra",
      input: [
        {
          role: "system",
          content:
            "You are NameTag's fast event research copilot. Answer the attendee's follow-up question using only the supplied event source, generated brief, stated goal, and private profile context. Be concise, useful, concrete, and tailored. Adapt advice to the private networkingRole and privateContext: student means low-pressure, curiosity-led language; builder means concrete proof and feedback; career means professional evidence and role-relevant questions; community means relationship-first language; exploring means a simple next move. Do not invent speakers, attendees, companies, agenda details, or web research. Only call a person a speaker or organizer when the source explicitly says so. When the source does not contain the requested fact, say that plainly, then give the attendee a useful next action or question to ask in person. The user's organization, school, interests, and privateContext are private background; do not repeat them unless the user directly asks about their own preparation. Never imply you browsed beyond the supplied source. Return only JSON matching the schema."
        },
        {
          role: "user",
          content: JSON.stringify({
            event: {
              name: payload.event.name,
              goal: payload.event.goal,
              focus: payload.event.focus,
              source
            },
            privateProfileContext: {
              networkingRole: payload.profile.networkingRole,
              organization: payload.profile.organization,
              school: payload.profile.school,
              interests: payload.profile.interests,
              privateContext: payload.profile.privateContext
            },
            brief: payload.brief,
            conversation: history,
            question
          })
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "nametag_research_chat",
          strict: true,
          schema
        }
      }
    })
  });

  if (!response.ok) {
    throw new Error("OpenAI research response failed");
  }

  const data = await response.json();
  const outputText =
    data.output_text ??
    data.output
      ?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content ?? [])
      .map((content: { text?: string }) => content.text)
      .filter(Boolean)
      .join("");

  if (!outputText) {
    throw new Error("OpenAI research response did not include JSON text");
  }

  return JSON.parse(outputText) as ResearchChatResult;
}

function mockResearchAnswer(payload: ResearchChatRequest, question: string): ResearchChatResult {
  const lowerQuestion = question.toLowerCase();
  const source = payload.event.researchContext || payload.event.urlOrDescription;
  const speakerNames = payload.brief.speakerHighlights ?? [];
  const hasSpecificSource = source.trim().length > 80;
  const topic = payload.brief.keyTopics[0] ?? "the event's main topic";
  const secondaryTopic = payload.brief.keyTopics[1] ?? topic;
  const role = payload.profile.networkingRole;
  const hasPrivateContext = Boolean(payload.profile.privateContext.trim());
  const privateTailoring = hasPrivateContext
    ? " I have also used the private background you saved to make the suggestions more relevant to you."
    : ` I am tailoring this to your ${role} mode; you can add a LinkedIn About or CV snippet in Settings for more context.`;
  let answer = "";

  if (lowerQuestion.includes("ask") || lowerQuestion.includes("question")) {
    answer =
      `Try one of these, then follow the answer instead of moving to the next question:\n\n1. “What part of ${topic} are you most focused on right now?”\n2. “What brought you to this event rather than another ${secondaryTopic} room?”\n3. “What kind of feedback, introduction, or resource would actually help after today?”${privateTailoring}`;
  } else if (lowerQuestion.includes("speaker") || lowerQuestion.includes("organizer") || lowerQuestion.includes("who")) {
    answer = speakerNames.length
      ? "The event source explicitly mentions: " +
        speakerNames.map((speaker) => speaker.replace(/[.]+$/, "")).join("; ") +
        ". Pick one person whose stated topic overlaps with your goal, and ask about the work they are already named for."
      : "I do not have a source-confirmed speaker or organizer list for this event. Ask an organizer, “Who should I make sure I hear from today, and what are they working on?” That gets you useful context without pretending the page gave us names.";
  } else if (lowerQuestion.includes("intro") || lowerQuestion.includes("introduce") || lowerQuestion.includes("pitch")) {
    answer = "A short optional introduction for this room is: " + payload.brief.intro + " Then ask what they are working on. Keep the longer story for when they ask a follow-up." + privateTailoring;
  } else if (lowerQuestion.includes("priority") || lowerQuestion.includes("first") || lowerQuestion.includes("meet")) {
    answer =
      "Prioritize " +
      (payload.brief.peopleToMeet?.[0]?.toLowerCase() ?? "people closest to the problem you are exploring") +
      ". Your first aim is one useful conversation with a clear next step, not the maximum number of introductions." + privateTailoring;
  } else if (
    lowerQuestion.includes("about") ||
    lowerQuestion.includes("understand") ||
    lowerQuestion.includes("what is") ||
    lowerQuestion.includes("what's")
  ) {
    answer = `${payload.brief.eventSummary}\n\nThe clearest signals are: ${(payload.brief.roomSignals ?? []).slice(0, 3).join("; ") || "the source has limited detail"}. Start by recognizing ${topic}, then use a specific question to learn what matters to the people in the room.${privateTailoring}`;
  } else {
    answer =
      hasSpecificSource
        ? `The event material points to ${topic}. I would begin by asking one specific question about that, then use the answer to decide whether this person is worth following up with.${privateTailoring}`
        : "The supplied event information is still light, so I would not assume details that are not there. I can still help you prepare a question about the room, decide what detail to ask an organizer for, or turn a source-confirmed topic into a useful conversation." + privateTailoring;
  }

  return {
    answer,
    suggestedQuestions: [
      "What is this event actually about?",
      `What should I ask about ${topic}?`,
      "Who should I prioritize first?"
    ]
  };
}
