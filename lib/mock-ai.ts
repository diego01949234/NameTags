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
  const signals: string[] = [];

  if (source.includes("hackathon") || source.includes("demo") || source.includes("build")) {
    signals.push("Build-and-show signal: lead with something concrete you can point to, not a broad personal summary.");
  }
  if (source.includes("seminar") || source.includes("talk") || source.includes("speaker")) {
    signals.push("Content-led signal: use one specific idea from the session to begin conversations after the talk.");
  }
  if (isCareer) {
    signals.push("Opportunity signal: make your work legible in one sentence, then offer the most relevant proof link.");
  }
  if (isCreator) {
    signals.push("Creative signal: ask about the other person's process before sharing your own channels.");
  }
  if (!signals.length) {
    signals.push("The event details are broad, so use the first conversations to learn who is in the room instead of assuming a narrow audience.");
  }

  signals.push(
    `Goal signal: use "${goalLabels[request.event.goal].label.toLowerCase()}" as the filter for which conversations deserve a follow-up.`
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

  const prepBrief: PrepBrief = {
    eventSummary:
      request.event.urlOrDescription.length > 40
        ? `Based on the event information you shared, ${request.event.name} is a room to exchange concrete ideas and turn the strongest conversations into a next step. Start by learning what kind of work and decisions are actually present, then share the proof that best supports your goal instead of trying to tell your whole story.`
        : `${request.event.name} has a short description, so this plan stays intentionally broad rather than pretending we know its agenda or speakers. Use the first conversations to map the room, test your introduction, and leave with one useful connection instead of trying to meet everyone.`,
    roomSignals: getRoomSignals(request, isCareer, isCreator),
    peopleToMeet: getPeopleToMeet(request.event.goal, isCareer, isCreator, role),
    recommendedApproach: `Start by confirming what is actually happening in this room with one question, then decide whether it is useful to share more about your work. ${
      privateBackground
        ? "NameTag used your private profile context to weight the questions and people here, but it never adds that context to the public card."
        : "Add optional context in Settings when you want future recommendations to become more personal."
    } End each promising conversation with one explicit next step: swap the card, set a follow-up, or make an introduction.`,
    speakerHighlights,
    keyTopics: isCareer
      ? ["Hiring", "Portfolio", "Resume", "Interview stories", "Product judgment"]
      : isCreator
        ? ["Audience", "Creative workflow", "Distribution", "Collaboration", "Tools"]
        : ["AI agents", "Codex", "Developer tools", "Product design", "Startups"],
    suggestedPeople: [],
    questionsToAsk:
      role === "student"
        ? [
            "What helped you most when you were just getting started?",
            "What are you hoping to get from this event?",
            "What is one project or skill you think matters in this room?",
            "Who else here should I make sure I meet?"
          ]
        : role === "builder"
          ? [
              "Where does this problem show up in your work?",
              "What would make this product immediately more useful for you?",
              "What is the most memorable demo you have seen today?",
              "Who should I talk to for blunt feedback on this?"
            ]
          : role === "career"
            ? [
                "What does strong evidence look like for this kind of work?",
                "What makes someone stand out in this field right now?",
                "Which project would you lead with in a conversation like this?",
                "Who else here has a useful perspective on this path?"
              ]
            : [
                "What are you hoping to get from this event?",
                "What is the most memorable demo you have seen today?",
                "How do you usually remember people after events?",
                "Which link would you actually want from me right now?"
              ],
    conversationStarters:
      role === "community"
        ? [
            "What part of the event made you decide to come?",
            "I liked your perspective on that. How did you get into this work?",
            "What are you curious about lately?"
          ]
        : role === "career"
          ? [
              "I am exploring where I can do my best product work. What does this field reward?",
              "What kind of project makes someone memorable to your team?",
              "I would love to hear how you made your path into this work."
            ]
          : [
              "I am testing a tool for people who feel underprepared at events.",
              "Do you use a different intro depending on the room?",
              "What is one follow-up you wish you had sent after a meetup?"
            ],
    intro: `Hi, I am ${displayName}.${identityLine ? ` I am ${identityLine}.` : ""}${
      request.profile.interests.trim() ? ` I am currently exploring ${request.profile.interests.trim()}.` : ""
    } I am here to ${goal.label.toLowerCase()}.`,
    shortPitch:
      `I am building NameTag because networking is often hardest before and after the actual conversation. Before an event, it turns a link or rough description into a grounded plan: what the room is about, questions worth asking, and a story you can actually use. During the event, one QR opens a focused card instead of making people choose between several handles. Afterward, it keeps the people, promises, and next messages together so a good conversation does not disappear into a stack of cards. I am looking for people who have felt that friction and can tell me where the flow should be sharper.`,
    recommendedGoal: goalText || goal.label,
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
    reasoning: buildReasoning(request.links, hiddenLinkIds, (goalText || goal.label).toLowerCase()),
    focus: request.event.focus ?? "",
    reasoningSummary:
      personaName === "Product Builder"
        ? "This is a builder-heavy room, so project proof and professional context matter most. Personal channels stay hidden until trust is higher."
        : "NameTag keeps the card focused on the event goal and hides links that feel too personal or off-topic for this room.",
    prepBrief
  };
}
