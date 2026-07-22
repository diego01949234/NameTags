export type LinkType =
  | "linkedin"
  | "github"
  | "instagram"
  | "line"
  | "email"
  | "portfolio"
  | "resume"
  | "demo"
  | "devpost"
  | "website"
  | "calendar"
  | "youtube"
  | "tiktok"
  | "other";

export type NetworkingRole = "exploring" | "student" | "builder" | "career" | "community";

export type UserProfile = {
  id: string;
  name: string;
  headline: string;
  defaultBio: string;
  /**
   * Private context the attendee chooses to paste from a CV or LinkedIn About.
   * It can tailor research, but is never part of the public card payload.
   */
  privateContext: string;
  location: string;
  organization: string;
  school: string;
  interests: string;
  networkingRole: NetworkingRole;
};

export type UserLink = {
  id: string;
  userId: string;
  label: string;
  type: LinkType;
  url: string;
  isSensitive?: boolean;
  note?: string;
};

export type EventGoal =
  | "find_collaborators"
  | "show_project"
  | "find_users"
  | "learn"
  | "find_opportunities"
  | "make_friends"
  | "meet_mentors"
  | "meet_founders";

export type ResearchSource = {
  title: string;
  url: string;
};

export type Event = {
  id: string;
  userId: string;
  name: string;
  urlOrDescription: string;
  goal: EventGoal;
  goals?: EventGoal[];
  customGoal?: string;
  focus?: string;
  networkingRole?: NetworkingRole;
  researchContext?: string;
  researchSourceUrl?: string;
  researchSources?: ResearchSource[];
  researchQuality?: "body" | "metadata" | "web" | "description" | "thin" | "screenshot" | "screenshot_web";
  isDemo?: boolean;
  debrief?: EventDebrief;
  cardId?: string;
  createdAt: string;
};

export type PrepBrief = {
  eventSummary: string;
  roomSignals: string[];
  peopleToMeet: string[];
  recommendedApproach: string;
  speakerHighlights: string[];
  keyTopics: string[];
  suggestedPeople: string[];
  questionsToAsk: string[];
  conversationStarters: string[];
  intro: string;
  shortPitch: string;
  recommendedGoal: string;
  recommendedPersona: string;
};

export type NametagCard = {
  id: string;
  userId: string;
  eventId: string;
  // Never included in the public card payload. It lets the owner alone poll
  // opted-in scanner contacts without exposing them to public card visitors.
  ownerSyncKey?: string;
  personaName: string;
  bio: string;
  cta: string;
  selectedLinkIds: string[];
  primaryLinkId?: string;
  hiddenLinkIds: string[];
  reasoningSummary: string;
  reasoning: string[];
  focus?: string;
  overrideNotes?: string[];
  researchMessages?: ResearchMessage[];
  prepBrief: PrepBrief;
  createdAt: string;
};

export type ResearchMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Public web sources used only for this answer, never profile information. */
  sources?: ResearchSource[];
  createdAt: string;
};

export type ResearchChatRequest = {
  profile: UserProfile;
  event: Pick<
    Event,
    "name" | "goal" | "focus" | "urlOrDescription" | "researchContext" | "researchSourceUrl" | "researchSources"
  >;
  brief: PrepBrief;
  question: string;
  history: Array<Pick<ResearchMessage, "role" | "content">>;
};

export type ResearchChatResult = {
  answer: string;
  suggestedQuestions: string[];
  sources?: ResearchSource[];
};

export type ContactPublicResearch = {
  matchStatus: "confirmed" | "ambiguous" | "not_found";
  summary: string;
  sources: ResearchSource[];
  researchedAt: string;
};

export type Contact = {
  id: string;
  eventId: string;
  cardId: string;
  name: string;
  contact: string;
  note: string;
  promise: string;
  priority: "high" | "medium" | "low";
  followUpDraft?: string;
  followUpReason?: string;
  followUpWindow?: "today" | "within_48_hours" | "this_week";
  /** User-triggered, source-linked public context. Private notes are never searched. */
  publicResearch?: ContactPublicResearch;
  done?: boolean;
  consentedAt?: string;
  createdAt: string;
};

export type PublicCard = {
  id: string;
  /** Versioned to prevent legacy AI copy from being rendered on public cards. */
  version?: 2;
  eventId?: string;
  ownerName: string;
  headline?: string;
  /** A person-written public introduction, if they chose to add one. */
  bio?: string;
  eventName?: string;
  links: Array<{
    label: string;
    type: LinkType;
    url: string;
  }>;
  createdAt: string;
};

export type FollowUp = {
  id: string;
  contactId: string;
  message: string;
  status: "to_send" | "sent" | "done";
};

export type EventDebrief = {
  summary: string;
  actionPlan: string[];
  organizedAt: string;
};

export type EventDebriefRequest = {
  event: Pick<Event, "id" | "name" | "goal" | "focus" | "networkingRole">;
  contacts: Contact[];
  notes: EventNote[];
};

export type ContactResearchRequest = {
  event: Pick<Event, "name" | "goal">;
  contact: Pick<Contact, "id" | "name" | "contact">;
};

export type EventDebriefResult = {
  summary: string;
  actionPlan: string[];
  contacts: Array<{
    contactId: string;
    priority: Contact["priority"];
    followUpDraft: string;
    followUpReason: string;
    followUpWindow: NonNullable<Contact["followUpWindow"]>;
  }>;
};

export type EventNote = {
  id: string;
  eventId: string;
  body: string;
  createdAt: string;
};

export type NametagState = {
  /** True only after the owner has completed the lightweight name/link setup. */
  setupComplete: boolean;
  profile: UserProfile;
  links: UserLink[];
  events: Event[];
  cards: NametagCard[];
  contacts: Contact[];
  followUps: FollowUp[];
  eventNotes: EventNote[];
};

export type GenerationRequest = {
  profile: UserProfile;
  links: UserLink[];
  event: Pick<Event, "name" | "urlOrDescription" | "goal" | "goals" | "customGoal" | "focus">;
};

export type GenerationResult = Omit<
  NametagCard,
  "id" | "userId" | "eventId" | "createdAt"
>;
