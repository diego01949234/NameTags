import { generateMockNametag } from "@/lib/mock-ai";
import { sanitizeGenerationRequest } from "@/lib/server/ai-input";
import { rateLimitRequest } from "@/lib/server/request-rate-limit";
import type { GenerationRequest, GenerationResult } from "@/lib/types";

export async function POST(request: Request) {
  const limit = rateLimitRequest(request, "generate", { maxRequests: 5, windowMs: 10 * 60 * 1000 });
  if (!limit.allowed) {
    return Response.json(
      { error: "You have made several event plans. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  let rawPayload: unknown;
  try {
    rawPayload = await request.json();
  } catch {
    return Response.json({ error: "Enter an event before creating your plan." }, { status: 400 });
  }
  const payload = sanitizeGenerationRequest(rawPayload);
  if (!payload) {
    return Response.json({ error: "Enter an event before creating your plan." }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json({
      mode: "mock",
      result: generateMockNametag(payload)
    });
  }

  try {
    const result = await generateWithOpenAI(payload);
    return Response.json({ mode: "openai", result });
  } catch (error) {
    console.error("OpenAI generation failed, using mock fallback", error);
    return Response.json({
      mode: "mock_fallback",
      result: generateMockNametag(payload)
    });
  }
}

async function generateWithOpenAI(payload: GenerationRequest): Promise<GenerationResult> {
  const schema = {
    type: "object",
    additionalProperties: false,
    required: [
      "personaName",
      "bio",
      "cta",
      "selectedLinkIds",
      "hiddenLinkIds",
      "reasoning",
      "focus",
      "reasoningSummary",
      "prepBrief"
    ],
    properties: {
      personaName: { type: "string" },
      bio: { type: "string", maxLength: 120 },
      cta: { type: "string", maxLength: 80 },
      selectedLinkIds: { type: "array", items: { type: "string" } },
      hiddenLinkIds: { type: "array", items: { type: "string" } },
      reasoning: { type: "array", items: { type: "string" } },
      focus: { type: "string" },
      reasoningSummary: { type: "string" },
      prepBrief: {
        type: "object",
        additionalProperties: false,
        required: [
          "eventSummary",
          "roomSignals",
          "peopleToMeet",
          "recommendedApproach",
          "speakerHighlights",
          "keyTopics",
          "suggestedPeople",
          "questionsToAsk",
          "conversationStarters",
          "intro",
          "shortPitch",
          "recommendedGoal",
          "recommendedPersona"
        ],
        properties: {
          eventSummary: { type: "string" },
          roomSignals: { type: "array", items: { type: "string" } },
          peopleToMeet: { type: "array", items: { type: "string" } },
          recommendedApproach: { type: "string" },
          speakerHighlights: { type: "array", items: { type: "string" } },
          keyTopics: { type: "array", items: { type: "string" } },
          suggestedPeople: { type: "array", items: { type: "string" } },
          questionsToAsk: { type: "array", items: { type: "string" } },
          conversationStarters: { type: "array", items: { type: "string" } },
          intro: { type: "string" },
          shortPitch: { type: "string" },
          recommendedGoal: { type: "string" },
          recommendedPersona: { type: "string" }
        }
      }
    }
  };

  const systemPrompt = [
    "You are NameTag's fast, source-grounded event research copilot.",
    "Generate a structured prep brief and a private link-selection recommendation for someone with no time to research before arriving. Return only valid JSON matching the schema.",
    "The supplied event urlOrDescription is the only event source. It may contain fetched event-page text, structured event details, a cited live-web research summary, a screenshot extraction, or a description written by the attendee.",
    "The user's networkingRole, organization, school, interests, and pasted privateContext are private background. Use them only to choose the most useful angle, questions, and next move; never repeat them or put them in a public bio, CTA, public card, or link reasoning.",
    "Before writing, work privately in this order: resolve the event material; separate confirmed facts from assumptions; connect those facts to the attendee's selected goal and specific outcome; then choose the smallest useful next moves. Do not reveal a chain of thought; make those distinctions legible through the requested fields instead.",
    "The product's primary job is to help the attendee understand the event, not manufacture a pitch. eventSummary must start by directly explaining what the supplied source confirms about the event. Its second sentence should explain why that matters for the user's stated goal. If the source is thin, say that in the first sentence instead of sounding certain.",
    "Use only supplied event content and the user's stated goal. Never invent speakers, organizers, people, companies, agenda items, event details, or outside research.",
    "roomSignals must contain 2-4 short labeled observations. Start each one with exactly Source:, Interpretation:, or Missing:. Source: is a fact from the material; Interpretation: is a clearly framed recommendation inferred from source and goal; Missing: identifies a useful fact that was not supplied.",
    "speakerHighlights may only contain people explicitly described as speakers, organizers, hosts, or featured guests in the source; format each as 'Name — exact supplied role, topic, or reason to notice'. suggestedPeople may only contain source-confirmed names and must otherwise be empty. If the page does not supply a confirmed speaker list, leave both arrays empty and make the missing information explicit in roomSignals.",
    "keyTopics must be exact or plainly derived terms from the source and may be empty. peopleToMeet must contain 3 useful roles or attendee archetypes, never made-up names.",
    "questionsToAsk must be concrete, event-specific, and tailored to the user's goal, specific outcome, and role. Each question should either uncover a source-supported detail, test the attendee's goal, or create a natural next conversation; avoid generic questions that could fit any event. When event details are thin, make questions help the attendee learn the room from an organizer or another attendee rather than pretending to know the agenda.",
    "recommendedApproach must give a lightweight, numbered three-step in-room strategy. Keep it specific to the source and goal; avoid generic networking advice. conversationStarters should feel natural and open-ended.",
    "intro and shortPitch are private optional material only; keep them concise and do not assume they will be used. For hackathons prefer GitHub, demo, Devpost, and LinkedIn. For career fairs prefer resume, portfolio, LinkedIn, and email. For creator events prefer Instagram, YouTube, TikTok, and portfolio. Hide sensitive or personal links unless the goal is social. Every hidden link must get one reasoning line in the format '<Link> hidden — <why>'. Keep all copy editable and demo-friendly."
  ].join(" ");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      // The prep brief is the product's core research moment. Use the same
      // research-capable model as live lookup so synthesis does not dilute it.
      model: process.env.OPENAI_RESEARCH_MODEL ?? "gpt-5.6",
      reasoning: { effort: process.env.OPENAI_REASONING_EFFORT ?? "high" },
      input: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: JSON.stringify(payload)
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "nametag_generation",
          strict: true,
          schema
        }
      }
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API returned ${response.status}`);
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
    throw new Error("OpenAI response did not include JSON text");
  }

  return JSON.parse(outputText) as GenerationResult;
}
