export function remainingTrialSeconds(deadline, now = Date.now()) {
  if (!deadline) return null;
  const end = Date.parse(deadline);
  return Number.isFinite(end) ? Math.max(0, Math.ceil((end - now) / 1000)) : null;
}
