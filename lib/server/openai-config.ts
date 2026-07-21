type ReasoningEffort = "low" | "medium" | "high";

function getReasoningEffort(value: string | undefined, fallback: ReasoningEffort): ReasoningEffort {
  if (value === "low" || value === "medium" || value === "high") return value;
  return fallback;
}

// The subway and in-room flows need a useful answer while the attendee still
// has attention to act on it. Deployments can opt into another tier explicitly.
export function getFastReasoningEffort(): ReasoningEffort {
  return getReasoningEffort(process.env.OPENAI_FAST_REASONING_EFFORT, "medium");
}

// Follow-up plans combine several private notes and should favor deliberation.
// Keep the legacy env name as a backwards-compatible deep-quality override.
export function getDeepReasoningEffort(): ReasoningEffort {
  return getReasoningEffort(
    process.env.OPENAI_DEEP_REASONING_EFFORT ?? process.env.OPENAI_REASONING_EFFORT,
    "high"
  );
}
