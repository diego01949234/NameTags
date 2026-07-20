export function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }

  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

// This is deliberately longer than a UI id: it is used as a private, device-held
// key when the owner syncs opted-in contacts from a public room pass.
export function makeSecret(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
  }

  return `${prefix}_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}
