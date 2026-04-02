/**
 * Returns true if the remote data should overwrite local.
 * Uses last-write-wins based on updatedAt timestamps.
 * If backend doesn't return updatedAt, local always wins (returns false).
 */
export function shouldOverwrite(
  localUpdatedAt: number,
  remoteUpdatedAt?: number
): boolean {
  if (remoteUpdatedAt === undefined) return false;
  return remoteUpdatedAt > localUpdatedAt;
}
