export function resolveCiRetries(value = process.env.PLAYWRIGHT_CI_RETRIES): number {
  const retries = Number(value)
  return Number.isFinite(retries) ? Math.max(0, Math.floor(retries)) : 1
}

export function resolveCiWorkers(value = process.env.PLAYWRIGHT_CI_WORKERS): number {
  const workers = Number(value ?? '2')
  return Number.isFinite(workers) && workers >= 1 ? Math.floor(workers) : 2
}
