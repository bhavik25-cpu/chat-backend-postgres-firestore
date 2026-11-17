export function shouldAdvanceLastSeen(
  currentTimeMs: number | undefined,
  currentMessageId: string | undefined,
  nextTimeMs: number,
  nextMessageId: string
): boolean {
  if (currentTimeMs === undefined) return true;
  if (nextTimeMs !== currentTimeMs) return nextTimeMs > currentTimeMs;
  return nextMessageId > (currentMessageId ?? '');
}
