import type { NetworkingRole } from "@/lib/types";

export type NetworkingRoleMeta = {
  label: string;
  shortLabel: string;
  pickerHint: string;
  description: string;
  prepNudge: string;
  cardNudge: string;
  followUpNudge: string;
  chatPrompts: [string, string, string];
};

export const networkingRoles: Record<NetworkingRole, NetworkingRoleMeta> = {
  exploring: {
    label: "Just exploring",
    shortLabel: "Exploring",
    pickerHint: "Start without a polished pitch",
    description: "You want a calm way to enter new rooms without needing a polished pitch.",
    prepNudge: "Start curious: learn what is happening in the room before trying to explain everything about yourself.",
    cardNudge: "Keep one useful link ready, but let the conversation decide whether to share more.",
    followUpNudge: "Choose one promising conversation and send a simple, specific note while it is still fresh.",
    chatPrompts: [
      "I am nervous. What should I say first?",
      "Who should I prioritize first?",
      "Make my intro more natural"
    ]
  },
  student: {
    label: "Student / early in my career",
    shortLabel: "Student",
    pickerHint: "Learn, meet, build confidence",
    description: "You are building confidence, context, and a first network.",
    prepNudge: "Lead with curiosity and one thing you are learning. A thoughtful question is enough to start.",
    cardNudge: "Prioritize a portfolio, LinkedIn, or one project. You do not need every credential on the card.",
    followUpNudge: "Thank people for a specific insight, then make one small request or offer a useful update.",
    chatPrompts: [
      "Give me an easy first question",
      "Help me sound confident without overexplaining",
      "Who should a student meet first?"
    ]
  },
  builder: {
    label: "Builder / founder",
    shortLabel: "Builder",
    pickerHint: "Demo, feedback, collaborators",
    description: "You are showing what you are making and looking for feedback, users, or collaborators.",
    prepNudge: "Lead with the concrete thing you are building, then ask where the other person sees this problem.",
    cardNudge: "Your demo or proof link should lead. Keep personal channels out until the conversation earns them.",
    followUpNudge: "Write down the feedback, owner, and promised next step before the detail disappears.",
    chatPrompts: [
      "Make my demo intro sharper",
      "Who could give useful product feedback?",
      "Turn this into a 15-second pitch"
    ]
  },
  career: {
    label: "Career move",
    shortLabel: "Career",
    pickerHint: "Opportunities, mentors, proof",
    description: "You are exploring roles, mentors, and professional opportunities.",
    prepNudge: "Lead with the work you want to do, not a full work history. Ask what strong evidence looks like here.",
    cardNudge: "Put your portfolio, resume, or LinkedIn first so the right proof is easy to find.",
    followUpNudge: "Follow up with a precise reference to the conversation and one relevant piece of work.",
    chatPrompts: [
      "Make this relevant for a hiring manager",
      "What proof should I lead with?",
      "Who is worth following up with?"
    ]
  },
  community: {
    label: "Community / creative",
    shortLabel: "Community",
    pickerHint: "Make genuine connections",
    description: "You are here to find people, exchange taste, and make genuine connections.",
    prepNudge: "Open with their work or process. Let the relationship come before the channel exchange.",
    cardNudge: "Show the one channel that best represents your work, not every social profile at once.",
    followUpNudge: "Send a note that carries the actual moment forward: an idea, reference, or invitation.",
    chatPrompts: [
      "Give me a natural conversation starter",
      "How do I share my work without sounding salesy?",
      "Who should I talk to after the session?"
    ]
  }
};

export const networkingRoleOptions = Object.entries(networkingRoles).map(([value, meta]) => ({
  value: value as NetworkingRole,
  ...meta
}));

export function getNetworkingRole(role?: NetworkingRole): NetworkingRoleMeta {
  return networkingRoles[role ?? "exploring"];
}
