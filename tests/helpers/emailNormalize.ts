/** Alineado con qai-pa-pdf-editor `normalizeEmailForApp`. */
export function normalizeEmailForApp(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return email
  const normalizedLocal = local.replace(/_/g, '')
  return `${normalizedLocal}@${domain}`
}
