import { goalLabels } from "@/lib/sample-data";
import type { GenerationRequest, GenerationResult, LinkType, NetworkingRole, PrepBrief, UserLink } from "@/lib/types";

const professionalTypes: LinkType[] = [
  "linkedin",
  "github",
  "demo",
  "devpost",
  "portfolio",
  "resume",
  "email",
  "website"
];

const sourceTopicPatterns = [
  { pattern: /\b(?:ai|artificial intelligence|llm|machine learning)\b/i, label: "AI" },
  { pattern: /\bagents?\b/i, label: "Agents" },
  { pattern: /\b(?:codex|developer tools?|devtools?)\b/i, label: "Developer tools" },
  { pattern: /\b(?:product|product management|ux|design)\b/i, label: "Product and design" },
  { pattern: /\b(?:founders?|startups?|venture)\b/i, label: "Founders and startups" },
  { pattern: /\b(?:career|hiring|recruit(?:ing|ment)|jobs?)\b/i, label: "Career" },
  { pattern: /\b(?:portfolio|resume|cv|interview)\b/i, label: "Portfolio and hiring" },
  { pattern: /\b(?:creator|audience|content|distribution)\b/i, label: "Creators and distribution" },
  { pattern: /\b(?:community|meetup|networking)\b/i, label: "Community" },
  { pattern: /\b(?:demo|showcase|pitch)\b/i, label: "Demos" },
  { pattern: /\b(?:research|learning|seminar|workshop|talk)\b/i, label: "Learning" }
] as const;

function cleanSourceText(value: string) {
  return value
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/Fetched event page (?:title|text):/gi, " ")
    .replace(/Event details extracted from screenshot:/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getSourceExcerpt(value: string) {
  const source = cleanSourceText(value);
  if (!source) return "";

  const sentences = source
    .split(/[.!?]+(?:\s+|$)|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 28)
    .filter((sentence) => !/cookie|privacy policy|sign in|accept all|javascript/i.test(sentence));

  return (sentences.slice(0, 2).join(". ") || source).slice(0, 420);
}

function hasUsefulSourceDetails(value: string) {
  return getSourceExcerpt(value).length >= 60;
}

function getSourceTopics(source: string, eventName: string) {
  const topics: string[] = [];
  const title = eventName.trim().replace(/\s+/g, " ");
  if (title && !/^untitled event$/i.test(title)) {
    topics.push(title.slice(0, 72));
  }

  for (const topic of sourceTopicPatterns) {
    if (topic.pattern.test(source)) topics.push(topic.label);
  }

  return Array.from(new Set(topics)).slice(0, 5);
}

function getPrimarySourceTopic(source: string, eventName: string) {
  return getSourceTopics(source, eventName)[1] ?? getSourceTopics(source, eventName)[0] ?? "the event's stated focus";
}

function buildEventSummary(request: GenerationRequest, goalText: string) {
  const source = request.event.urlOrDescription;
  const excerpt = getSourceExcerpt(source);
  const topic = getPrimarySourceTopic(source, request.event.name);
  const role = request.profile.networkingRole;

  if (!hasUsefulSourceDetails(source)) {
    return `The supplied material only confirms the event name: ${request.event.name}. NameTag cannot confirm an agenda, speaker list, or audience yet, so use the chat to decide what detail to ask an organizer for. For your ${role} lens and goal of ${goalText.toLowerCase()}, start with one conversation about ${topic} rather than assuming the room's priorities.`;
  }

  return `From the event material: ${excerpt}. For your ${role} lens and goal of ${goalText.toLowerCase()}, use the chat to turn ${topic} into a specific question before you walk in.`;
}

function buildRecommendedApproach(
  request: GenerationRequest,
  topic: string,
  goalText: string,
  hasPrivateBackground: boolean
) {
  const personalization = hasPrivateBackground
    ? "NameTag used your private background to tune the angle, but it never appears on the public card."
    : "Add optional background in Settings when you want future questions to be even more specific.";

  return `1. Ask how ${topic} is showing up for the person in front of you. 2. Listen for a connection to ${goalText.toLowerCase()} before sharing more of your own context. 3. End one promising conversation with a clear next step: swap the card, ask for feedback, or agree on a follow-up. ${personalization}`;
}

function getMockQuestions(role: NetworkingRole, topic: string) {
  if (role === "student") {
    return [
      `What part of ${topic} are you most interested in right now?`,
      "What brought you to this event?",
      "What helped you most when you were just getting started?",
      "Who else here should I make sure I meet?"
    ];
  }
  if (role === "builder") {
    return [
      `Where does ${topic} show up in your work?`,
      `What would make ${topic} more useful in practice?`,
      "What is the most concrete thing you are testing right now?",
      "Who should I talk to for direct feedback on this?"
    ];
  }
  if (role === "career") {
    return [
      `How does ${topic} matter in the work or team you are building?`,
      "What does strong evidence look like in this field?",
      "Which project would you lead with in a conversation like this?",
      "Who else here has a useful perspective on this path?"
    ];
  }
  if (role === "community") {
    return [
      `What made ${topic} worth showing up for today?`,
      "What are you hoping to leave with from this event?",
      "What are you curious about lately?",
      "Who else would you recommend I talk to?"
    ];
  }
  return [
    `What made you interested in ${topic}?`,
    "What are you hoping to get from this event?",
    "What is the most useful idea you have heard so far?",
    "Who else here should I make sure I meet?"
  ];
}

function getMockConversationStarters(role: NetworkingRole, topic: string) {
  if (role === "career") {
    return [
      `I am trying to understand how ${topic} connects to strong work in this field. What has your experience been?`,
      "What kind of project makes someone memorable to your team?",
      "How did you find your way into this work?"
    ];
  }
  if (role === "community") {
    return [
      `What part of ${topic} made you decide to come?`,
      "I liked your perspective on that. How did you get into this work?",
      "What are you curious about lately?"
    ];
  }
  return [
    `What brought you to a room about ${topic}?`,
    `What is one thing you are trying to learn or test around ${topic}?`,
    "What would make this event genuinely useful for you?"
  ];
}

function byType(links: UserLink[], types: LinkType[]) {
  return links.filter((link) => types.includes(link.type)).map((link) => link.id);
}

function chooseLinks(request: GenerationRequest) {
  const text =
    `${request.event.name} ${request.event.urlOrDescription} ${request.event.goal} ${(request.event.goals ?? []).join(" ")} ${request.event.customGoal ?? ""} ${request.event.focus ?? ""}`.toLowerCase();
  const links = request.links;
  const goals = request.event.goals ?? [request.event.goal];

  let preferred: LinkType[] = ["linkedin", "github", "demo", "devpost"];

  if (request.profile.networkingRole === "career" || text.includes("career") || text.includes("job") || goals.includes("find_opportunities")) {
    preferred = ["resume", "portfolio", "linkedin", "email"];
  } else if (request.profile.networkingRole === "community" || text.includes("creator") || text.includes("youtube") || text.includes("tiktok")) {
    preferred = ["instagram", "youtube", "tiktok", "portfolio"];
  } else if (text.includes("casual") || goals.includes("make_friends")) {
    preferred = ["instagram", "line", "website"];
  } else if (goals.includes("find_users")) {
    preferred = ["demo", "website", "linkedin", "email"];
  } else if (goals.includes("show_project") || goals.includes("meet_founders")) {
    preferred = ["demo", "github", "devpost", "linkedin"];
  }

  const selected = byType(links, preferred);
  const fallback = byType(links, professionalTypes).filter((id) => !selected.includes(id));
  const selectedLinkIds = [...selected, ...fallback].slice(0, 4);
  const hiddenLinkIds = links
    .filter((link) => !selectedLinkIds.includes(link.id))
    .map((link) => link.id);

  return { selectedLinkIds, hiddenLinkIds };
}

function buildReasoning(links: UserLink[], hiddenLinkIds: string[], goalText: string) {
  return hiddenLinkIds.map((id) => {
    const link = links.find((item) => item.id === id);
    if (!link) return `Link hidden — not relevant to this event goal.`;
    if (link.isSensitive) {
      return `${link.label} hidden — sensitive/personal channel stays private for ${goalText}.`;
    }
    if (link.type === "instagram" || link.type === "line") {
      return `${link.label} hidden — this room needs professional context before personal access.`;
    }
    return `${link.label} hidden — less relevant than the links that support ${goalText}.`;
  });
}

function getRoomSignals(request: GenerationRequest, isCareer: boolean, isCreator: boolean) {
  const source = `${request.event.name} ${request.event.urlOrDescription}`.toLowerCase();
  const sourceExcerpt = getSourceExcerpt(request.event.urlOrDescription);
  const sourceTopics = getSourceTopics(request.event.urlOrDescription, request.event.name);
  const signals: string[] = [];

  if (hasUsefulSourceDetails(request.event.urlOrDescription)) {
    signals.push(`Source: ${sourceExcerpt}`);
  } else {
    signals.push("Missing source detail: the supplied material does not confirm the agenda, speakers, or who will attend.");
  }

  if (source.includes("hackathon") || source.includes("demo") || source.includes("build")) {
    signals.push("Interpretation: this reads like a build-and-show room, so lead with something concrete instead of a broad personal summary.");
  }
  if (source.includes("seminar") || source.includes("talk") || source.includes("speaker")) {
    signals.push("Interpretation: this is content-led, so use one source-supported idea from the session to begin conversations after the talk.");
  }
  if (isCareer) {
    signals.push("Goal lens: make your work legible in one sentence, then offer the most relevant proof link.");
  }
  if (isCreator) {
    signals.push("Goal lens: ask about the other person's process before sharing your own channels.");
  }
  if (signals.length === 1 && sourceTopics.length) {
    signals.push(`Source topics: ${sourceTopics.slice(0, 3).join(", ")}.`);
  }
  if (signals.length === 1) {
    signals.push("Next move: use the first conversation to learn what is happening in the room instead of assuming a narrow audience.");
  }

  signals.push(
    `Your goal: use "${goalLabels[request.event.goal].label.toLowerCase()}" as the filter for which conversations deserve a follow-up.`
  );
  return signals.slice(0, 3);
}

function getPeopleToMeet(
  goal: GenerationRequest["event"]["goal"],
  isCareer: boolean,
  isCreator: boolean,
  role: NetworkingRole
) {
  if (role === "student") {
    return [
      "People who can explain how they found their way into this field.",
      "Peers who are also learning or building something adjacent.",
      "One generous practitioner whose point of view you want to understand."
    ];
  }
  if (isCareer) {
    return [
      "People close to the work you want to do, not only recruiters.",
      "Hiring managers or operators who can explain what strong evidence looks like in this field.",
      "Peers navigating a similar transition who may know the informal map of the space."
    ];
  }
  if (isCreator) {
    return [
      "Creators with a repeatable process you genuinely want to understand.",
      "Potential collaborators whose audience or medium complements yours.",
      "People who have already solved a distribution problem you are facing."
    ];
  }
  if (goal === "find_users") {
    return [
      "People who have the problem you are testing, even if they are not your ideal user yet.",
      "Operators who see that problem repeatedly in their work.",
      "Builders who can give blunt feedback on your current demo or flow."
    ];
  }
  if (goal === "meet_mentors") {
    return [
      "Practitioners one or two steps ahead of the problem you are working through.",
      "People with a strong point of view who can challenge one specific decision.",
      "Organizers who know where focused follow-up conversations happen after the event."
    ];
  }
  return [
    "People who are actively building or testing something adjacent to your work.",
    "Attendees who can make a useful introduction after hearing your one-line story.",
    "One person whose perspective would make your next action more specific."
  ];
}

function getDefaultCta(goal: GenerationRequest["event"]["goal"]) {
  const ctas: Record<GenerationRequest["event"]["goal"], string> = {
    find_collaborators: "Let’s compare what we are building",
    show_project: "Ask me about the project I am shipping",
    find_users: "Tell me where this problem shows up for you",
    learn: "Share one idea you are excited to test",
    find_opportunities: "Let’s talk about strong product work",
    make_friends: "Come say hi",
    meet_mentors: "Ask me where this flow could be sharper",
    meet_founders: "Let’s trade notes on what we are building"
  };
  return ctas[goal];
}

function extractConfirmedSpeakers(source: string) {
  const blocks =
    source.match(/(?:speakers?|featured guests?|hosts?|organizers?)\s*[:\-]\s*[^.\n]{3,260}/gi) ?? [];
  const ignoredWords = new Set([
    "OpenAI",
    "Build",
    "Week",
    "Career",
    "Fair",
    "Product",
    "Developer",
    "Taipei",
    "NameTag",
    "National",
    "Taiwan",
    "University"
  ]);
  const names = blocks
    .flatMap((block) =>
      block
        .replace(/^(?:speakers?|featured guests?|hosts?|organizers?)\s*[:\-]\s*/i, "")
        .split(/[;,]/)
        .flatMap((entry) => entry.trim().match(/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}\b/) ?? [])
    )
    .filter((name) => !name.split(/\s+/).some((word) => ignoredWords.has(word)));

  return Array.from(new Set(names)).slice(0, 5).map((name) => `${name} — named in the event details.`);
}

export function generateMockNametag(request: GenerationRequest): GenerationResult {
  const { selectedLinkIds, hiddenLinkIds } = chooseLinks(request);
  const goal = goalLabels[request.event.goal];
  const displayName = request.profile.name.trim() || "there";
  const identityLine =
    request.profile.headline.trim() ||
    (request.profile.school.trim() ? `a student at ${request.profile.school.trim()}` : "") ||
    (request.profile.organization.trim() ? `part of ${request.profile.organization.trim()}` : "") ||
    request.profile.defaultBio.trim();
  const privateBackground = [
    request.profile.organization,
    request.profile.school,
    request.profile.interests,
    request.profile.privateContext
  ]
    .map((item) => item.trim())
    .filter(Boolean)
    .join(" · ");
  const goalText = [
    ...(request.event.goals ?? [request.event.goal]).map((item) => goalLabels[item].label),
    request.event.customGoal
  ]
    .filter(Boolean)
    .join(" + ");
  const lower = `${request.event.name} ${request.event.urlOrDescription}`.toLowerCase();
  const role = request.profile.networkingRole;
  const isCareer = role === "career" || lower.includes("career") || request.event.goal === "find_opportunities";
  const isCreator = role === "community" || lower.includes("creator") || lower.includes("youtube") || lower.includes("tiktok");
  const personaName =
    role === "student"
      ? "Curious Builder"
      : isCareer
        ? "Product Operator"
        : isCreator
          ? "Creative Builder"
          : "Product Builder";
  const speakerHighlights = extractConfirmedSpeakers(request.event.urlOrDescription);
  const sourceTopics = getSourceTopics(request.event.urlOrDescription, request.event.name);
  const sourceTopic = getPrimarySourceTopic(request.event.urlOrDescription, request.event.name);
  const briefGoal = goalText || goal.label;

  const prepBrief: PrepBrief = {
    eventSummary: buildEventSummary(request, briefGoal),
    roomSignals: getRoomSignals(request, isCareer, isCreator),
    peopleToMeet: getPeopleToMeet(request.event.goal, isCareer, isCreator, role),
    recommendedApproach: buildRecommendedApproach(request, sourceTopic, briefGoal, Boolean(privateBackground)),
    speakerHighlights,
    keyTopics: sourceTopics,
    suggestedPeople: [],
    questionsToAsk: getMockQuestions(role, sourceTopic),
    conversationStarters: getMockConversationStarters(role, sourceTopic),
    intro: `Hi, I am ${displayName}.${identityLine ? ` I am ${identityLine}.` : ""}${
      request.profile.interests.trim() ? ` I am currently exploring ${request.profile.interests.trim()}.` : ""
    } I am here to ${briefGoal.toLowerCase()}. I was curious how ${sourceTopic} is showing up for you.`,
    shortPitch:
      `${identityLine ? `I am ${identityLine}.` : `I am ${displayName}.`} I am here to ${briefGoal.toLowerCase()} and I am especially interested in how ${sourceTopic} is showing up in real work. I would love to compare notes, learn what you are testing, and leave with one useful next step.`,
    recommendedGoal: briefGoal,
    recommendedPersona: personaName
  };

  return {
    personaName,
    bio:
      request.profile.defaultBio.trim() ||
      (isCareer
        ? "Product builder connecting practical product craft with strong execution."
        : isCreator
          ? "Building useful tools and sharing the process with curious makers."
          : "Open to useful conversations and thoughtful collaboration."),
    cta: request.event.focus?.trim()
      ? `Ask me about ${request.event.focus.trim()}`
      : getDefaultCta(request.event.goal),
    selectedLinkIds,
    hiddenLinkIds,
    reasoning: buildReasoning(request.links, hiddenLinkIds, briefGoal.toLowerCase()),
    focus: request.event.focus ?? "",
    reasoningSummary:
      hasUsefulSourceDetails(request.event.urlOrDescription)
        ? `NameTag chose links that support ${briefGoal.toLowerCase()} in a room about ${sourceTopic}.`
        : "The source is light, so NameTag keeps the card focused on your goal and hides links that feel too personal or off-topic.",
    prepBrief
  };
}
