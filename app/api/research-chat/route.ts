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
  const systemPrompt = [
    "You are NameTag's event research copilot. Answer one attendee follow-up question using only the supplied event source, generated brief, stated goal, and private profile context.",
    "Start with a direct answer to what the attendee asked. Then, where helpful, use short labeled sections such as 'What the source confirms:' and 'Next move:'. Use short bullets when giving questions or options.",
    "Be specific and tailored: the private networkingRole and privateContext should change which decision, question, or next action you recommend. Do not repeat private details unless the attendee explicitly asks about their own preparation.",
    "Do not invent speakers, attendees, companies, agenda details, or web research. Only call someone a speaker or organizer when the source explicitly says so. When the source does not contain a requested fact, lead with 'Missing:' and say that plainly, then give a useful question the attendee can ask in person.",
    "Do not use generic networking coaching or manufacture a pitch unless the attendee asks for one. Never imply you browsed beyond the supplied source. Return only JSON matching the schema."
  ].join(" ");

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
          content: systemPrompt
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
  const speakerNames = payload.brief.speakerHighlights ?? [];
  const hasSpecificSource = (payload.brief.roomSignals ?? []).some((signal) => signal.startsWith("Source:"));
  const topic = payload.brief.keyTopics[0] ?? "the event's main topic";
  const secondaryTopic = payload.brief.keyTopics[1] ?? topic;
  const role = payload.profile.networkingRole;
  const roleNextMove: Record<typeof role, string> = {
    student: "Keep it curiosity-led and low-pressure: one good question is enough.",
    builder: "Prioritize concrete examples and feedback over a broad explanation.",
    career: "Listen for what strong evidence looks like before sharing your own materials.",
    community: "Start with their process and context before asking for a connection.",
    exploring: "Use the answer to choose one clear person or question to prioritize."
  };
  let answer = "";

  if (lowerQuestion.includes("ask") || lowerQuestion.includes("question")) {
    answer =
      `Try one, then follow the answer instead of moving to the next question:\n\n- “What part of ${topic} are you most focused on right now?”\n- “What brought you to this event rather than another ${secondaryTopic} room?”\n- “What kind of feedback, introduction, or resource would actually help after today?”\n\nNext move: ${roleNextMove[role]}`;
  } else if (lowerQuestion.includes("speaker") || lowerQuestion.includes("organizer") || lowerQuestion.includes("who")) {
    answer = speakerNames.length
      ? "What the source confirms:\n" +
        speakerNames.map((speaker) => `- ${speaker.replace(/[.]+$/, "")}`).join("\n") +
        "\n\nNext move: pick one person whose stated topic overlaps with your goal, then ask about the work they are already named for."
      : "Missing: I do not have a source-confirmed speaker or organizer list for this event.\n\nAsk an organizer: “Who should I make sure I hear from today, and what are they working on?” That gets you useful context without pretending the page gave us names.";
  } else if (lowerQuestion.includes("intro") || lowerQuestion.includes("introduce") || lowerQuestion.includes("pitch")) {
    answer = "A short optional introduction for this room is:\n\n“" + payload.brief.intro + "”\n\nThen ask what they are working on. Keep the longer story for when they ask a follow-up.";
  } else if (lowerQuestion.includes("priority") || lowerQuestion.includes("first") || lowerQuestion.includes("meet")) {
    answer =
      "Prioritize " +
      (payload.brief.peopleToMeet?.[0]?.toLowerCase() ?? "people closest to the problem you are exploring") +
      ". Your first aim is one useful conversation with a clear next step, not the maximum number of introductions.\n\nNext move: " +
      roleNextMove[role];
  } else if (
    lowerQuestion.includes("about") ||
    lowerQuestion.includes("understand") ||
    lowerQuestion.includes("what is") ||
    lowerQuestion.includes("what's")
  ) {
    answer = `What the source confirms:\n${payload.brief.eventSummary}\n\nKey signals:\n${
      (payload.brief.roomSignals ?? []).slice(0, 3).map((signal) => `- ${signal}`).join("\n") || "- Missing: the source has limited detail."
    }\n\nNext move: ask one specific question about ${topic}, then use the answer to learn what matters to the people in the room.`;
  } else {
    answer =
      hasSpecificSource
        ? `What the source confirms:\n${payload.brief.eventSummary}\n\nNext move: ask one specific question about ${topic}, then use the answer to decide whether this person is worth following up with. ${roleNextMove[role]}`
        : "Missing: the supplied event information is still light, so I would not assume details that are not there. I can still help you prepare a question about the room, decide what detail to ask an organizer for, or turn a source-confirmed topic into a useful conversation.";
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
