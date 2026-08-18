export function retentionCutoffs(now = Date.now()) {
  const confirmedCutoffDate = new Date(now)
  confirmedCutoffDate.setUTCMonth(confirmedCutoffDate.getUTCMonth() - 24)

  return {
    pendingCutoff: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
    confirmedCutoff: confirmedCutoffDate.toISOString(),
    rateCutoff: Math.floor(now / 1000) - 24 * 60 * 60,
  }
}
