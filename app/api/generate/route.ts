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

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-5.6-terra",
      input: [
        {
          role: "system",
          content:
            "You are NameTag's fast, source-grounded event research copilot. Generate a structured prep brief and a private link-selection recommendation for someone with no time to research before arriving. Return only valid JSON matching the schema. The user's networkingRole, organization, school, interests, and pasted privateContext are private background for tailoring what they should notice, who they should seek out, and which questions will matter to them. Never include any private background in a public bio, CTA, public card, or link reasoning. The product's primary job is to help the attendee understand the event, not manufacture a pitch. Use only supplied event content and user goal; never invent speakers, organizers, people, companies, agenda items, or event details. speakerHighlights may only contain people explicitly described as speakers, organizers, hosts, or featured guests in the source; format each as 'Name — exact supplied role, topic, or reason to notice'. suggestedPeople may only contain source-confirmed names and must otherwise be empty. If the page does not supply a confirmed speaker list, leave both arrays empty and make the missing information explicit in roomSignals. roomSignals must contain 2-4 observations grounded in supplied event material, and may explicitly say information is missing. peopleToMeet must contain 3 useful roles or attendee archetypes, never made-up names. recommendedApproach must give a concrete three-step in-room strategy tailored to the goal and available private profile context. Make eventSummary two or three grounded sentences, provide 4-6 concrete topics, 4-6 useful questions, and 3-5 natural conversation starters. intro and shortPitch are private optional material only; keep them concise and do not assume they will be used. For hackathons prefer GitHub, demo, Devpost, and LinkedIn. For career fairs prefer resume, portfolio, LinkedIn, and email. For creator events prefer Instagram, YouTube, TikTok, and portfolio. Hide sensitive/personal links unless the goal is social. Every hidden link must get one reasoning line in the format '<Link> hidden — <why>'. Keep all copy editable and demo-friendly."
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
