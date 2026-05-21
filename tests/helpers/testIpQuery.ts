export function resolveDefaultTestIp(): string | undefined {
  const fromEnv = process.env.PLAYWRIGHT_DEFAULT_TEST_IP?.trim()
  if (fromEnv) return fromEnv
  if (process.env.CI) return 'ES'
  return undefined
}

export function homeQueryFromTestData(td: Record<string, string>): Record<string, string> | undefined {
  const ip = td.ip?.trim()
  if (ip && ip !== 'Default') return { ip }
  const defaultIp = resolveDefaultTestIp()
  if (defaultIp) return { ip: defaultIp }
  return undefined
}
