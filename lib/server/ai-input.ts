import type {
  Contact,
  EventDebriefRequest,
  EventGoal,
  GenerationRequest,
  LinkType,
  NetworkingRole,
  PrepBrief,
  ResearchChatRequest,
  UserLink,
  UserProfile
} from "@/lib/types";

const eventGoals = new Set<EventGoal>([
  "find_collaborators",
  "show_project",
  "find_users",
  "learn",
  "find_opportunities",
  "make_friends",
  "meet_mentors",
  "meet_founders"
]);

const linkTypes = new Set<LinkType>([
  "linkedin",
  "github",
  "instagram",
  "line",
  "email",
  "portfolio",
  "resume",
  "demo",
  "devpost",
  "website",
  "calendar",
  "youtube",
  "tiktok",
  "other"
]);

const networkingRoles = new Set<NetworkingRole>([
  "exploring",
  "student",
  "builder",
  "career",
  "community"
]);

export function sanitizeGenerationRequest(value: unknown): GenerationRequest | null {
  const payload = asRecord(value);
  const event = asRecord(payload?.event);
  if (!event) return null;

  const description = cleanText(event.urlOrDescription, 7_500);
  if (!description) return null;

  const goal = isEventGoal(event.goal) ? event.goal : "find_collaborators";
  const goals = Array.isArray(event.goals)
    ? event.goals.filter(isEventGoal).slice(0, 1)
    : [goal];

  return {
    profile: sanitizeProfile(payload?.profile),
    links: Array.isArray(payload?.links)
      ? payload.links.map(sanitizeLink).filter((link): link is UserLink => Boolean(link)).slice(0, 20)
      : [],
    event: {
      name: cleanText(event.name, 180) || "Untitled event",
      urlOrDescription: description,
      goal,
      goals: goals.length ? goals : [goal],
      customGoal: cleanText(event.customGoal, 240),
      focus: cleanText(event.focus, 320)
    }
  };
}

export function sanitizeResearchRequest(value: unknown): ResearchChatRequest | null {
  const payload = asRecord(value);
  const event = asRecord(payload?.event);
  if (!event) return null;
  return {
    profile: sanitizeProfile(payload?.profile),
    event: {
      name: cleanText(event.name, 180) || "This event",
      goal: isEventGoal(event.goal) ? event.goal : "find_collaborators",
      focus: cleanText(event.focus, 320),
      urlOrDescription: cleanText(event.urlOrDescription, 7_500),
      researchContext: cleanText(event.researchContext, 7_000),
      researchSourceUrl: cleanText(event.researchSourceUrl, 2_048)
    },
    brief: sanitizePrepBrief(asRecord(payload?.brief) as PrepBrief),
    question: cleanText(payload?.question, 600),
    history: (Array.isArray(payload?.history) ? payload.history : [])
      .slice(-6)
      .map((message) => {
        const item = asRecord(message);
        return {
          role: item?.role === "assistant" ? ("assistant" as const) : ("user" as const),
          content: cleanText(item?.content, 800)
        };
      })
      .filter((message) => message.content)
  };
}

export function sanitizeDebriefRequest(value: unknown): EventDebriefRequest | null {
  const payload = asRecord(value);
  const event = asRecord(payload?.event);
  if (!event) return null;
  return {
    event: {
      id: cleanText(event.id, 80),
      name: cleanText(event.name, 180),
      goal: isEventGoal(event.goal) ? event.goal : "find_collaborators",
      focus: cleanText(event.focus, 320),
      networkingRole: isNetworkingRole(event.networkingRole) ? event.networkingRole : "exploring"
    },
    contacts: (Array.isArray(payload?.contacts) ? payload.contacts : [])
      .slice(0, 40)
      .map(sanitizeContact)
      .filter((contact) => contact.id),
    notes: (Array.isArray(payload?.notes) ? payload.notes : [])
      .slice(0, 20)
      .map((note) => ({
        id: cleanText(note?.id, 80),
        eventId: cleanText(note?.eventId, 80),
        body: cleanText(note?.body, 1_200),
        createdAt: cleanText(note?.createdAt, 80)
      }))
      .filter((note) => note.body)
  };
}

function sanitizeProfile(value: unknown): UserProfile {
  const profile = asRecord(value);
  return {
    id: cleanText(profile?.id, 80),
    name: cleanText(profile?.name, 120),
    headline: cleanText(profile?.headline, 240),
    defaultBio: cleanText(profile?.defaultBio, 600),
    privateContext: cleanText(profile?.privateContext, 2_000),
    location: cleanText(profile?.location, 120),
    organization: cleanText(profile?.organization, 240),
    school: cleanText(profile?.school, 240),
    interests: cleanText(profile?.interests, 600),
    networkingRole: isNetworkingRole(profile?.networkingRole) ? profile.networkingRole : "exploring"
  };
}

function sanitizeLink(value: unknown): UserLink | null {
  const link = asRecord(value);
  const id = cleanText(link?.id, 80);
  const url = cleanText(link?.url, 600);
  if (!id || !url) return null;
  return {
    id,
    userId: cleanText(link?.userId, 80),
    label: cleanText(link?.label, 120) || "Link",
    type: isLinkType(link?.type) ? link.type : "other",
    url,
    isSensitive: Boolean(link?.isSensitive),
    note: cleanText(link?.note, 240)
  };
}

function sanitizePrepBrief(value: PrepBrief): PrepBrief {
  return {
    eventSummary: cleanText(value?.eventSummary, 900),
    roomSignals: cleanList(value?.roomSignals, 4, 220),
    peopleToMeet: cleanList(value?.peopleToMeet, 4, 180),
    recommendedApproach: cleanText(value?.recommendedApproach, 800),
    speakerHighlights: cleanList(value?.speakerHighlights, 8, 220),
    keyTopics: cleanList(value?.keyTopics, 8, 120),
    suggestedPeople: cleanList(value?.suggestedPeople, 8, 180),
    questionsToAsk: cleanList(value?.questionsToAsk, 8, 220),
    conversationStarters: cleanList(value?.conversationStarters, 6, 220),
    intro: cleanText(value?.intro, 500),
    shortPitch: cleanText(value?.shortPitch, 1_000),
    recommendedGoal: cleanText(value?.recommendedGoal, 240),
    recommendedPersona: cleanText(value?.recommendedPersona, 240)
  };
}

function sanitizeContact(contact: unknown): Contact {
  const value = asRecord(contact);
  return {
    id: cleanText(value?.id, 80),
    eventId: cleanText(value?.eventId, 80),
    cardId: cleanText(value?.cardId, 80),
    name: cleanText(value?.name, 120),
    contact: cleanText(value?.contact, 240),
    note: cleanText(value?.note, 700),
    promise: cleanText(value?.promise, 240),
    priority: value?.priority === "high" || value?.priority === "low" ? value.priority : "medium",
    followUpDraft: cleanText(value?.followUpDraft, 1_000),
    followUpReason: cleanText(value?.followUpReason, 240),
    followUpWindow:
      value?.followUpWindow === "today" ||
      value?.followUpWindow === "within_48_hours" ||
      value?.followUpWindow === "this_week"
        ? value.followUpWindow
        : undefined,
    done: Boolean(value?.done),
    createdAt: cleanText(value?.createdAt, 80)
  };
}

function cleanList(value: unknown, maxItems: number, maxItemLength: number) {
  return (Array.isArray(value) ? value : [])
    .map((item) => cleanText(item, maxItemLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isEventGoal(value: unknown): value is EventGoal {
  return typeof value === "string" && eventGoals.has(value as EventGoal);
}

function isLinkType(value: unknown): value is LinkType {
  return typeof value === "string" && linkTypes.has(value as LinkType);
}

function isNetworkingRole(value: unknown): value is NetworkingRole {
  return typeof value === "string" && networkingRoles.has(value as NetworkingRole);
}
