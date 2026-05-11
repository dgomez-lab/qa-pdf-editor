import { normalizeEmailForApp } from './emailNormalize'

/**
 * Cliente mínimo Mailpit (API v1) para magic links y tests de
 * `TransactionalEmails.feature`. Alineado con qai-pa-pdf-editor `MailpitApi`.
 *
 * Variables:
 * - `PLAYWRIGHT_MAILPIT_URL` — base, p.ej. `https://mailpit.1ecorp.net/api/v1`
 * - `PLAYWRIGHT_MAILPIT_USER` / `PLAYWRIGHT_MAILPIT_PASSWORD` — Basic Auth opcional
 */

export type MailpitMessageSummary = {
  ID: string
  Subject: string
  To?: Array<{ Address?: string }>
  Created: string
}

export type MailpitMessagesResponse = {
  total: number
  count: number
  messages: MailpitMessageSummary[]
}

export type MailpitMessageDetail = {
  ID: string
  Subject: string
  HTML?: string
  Text?: string
}

/**
 * Defaults heredados de qai-pa-pdf-editor (`MailpitApi.base` y `testJsonData.json`).
 * Se mantienen como fallback para no exigir credenciales explícitas en cada ejecución
 * contra staging.
 */
const LEGACY_MAILPIT_BASE = 'https://mailpit.1ecorp.net/api/v1'

function authHeader(): Record<string, string> {
  const u = process.env.PLAYWRIGHT_MAILPIT_USER?.trim()
  const p = process.env.PLAYWRIGHT_MAILPIT_PASSWORD?.trim()
  if (!u || !p) return {}
  const basic = Buffer.from(`${u}:${p}`).toString('base64')
  return { Authorization: `Basic ${basic}` }
}

function baseUrl(): string {
  const b = process.env.PLAYWRIGHT_MAILPIT_URL?.trim()
  if (b) return b.replace(/\/+$/, '')
  return LEGACY_MAILPIT_BASE
}

export function isMailpitConfigured(): boolean {
  const hasUrl = !!(process.env.PLAYWRIGHT_MAILPIT_URL?.trim() || LEGACY_MAILPIT_BASE)
  const hasAuth = !!(process.env.PLAYWRIGHT_MAILPIT_USER?.trim() && process.env.PLAYWRIGHT_MAILPIT_PASSWORD?.trim())
  return hasUrl && hasAuth
}

export async function mailpitListMessages(search: string, limit = 50): Promise<MailpitMessagesResponse> {
  const url = `${baseUrl()}/messages?limit=${limit}&search=${encodeURIComponent(search)}`
  const res = await fetch(url, { headers: { Accept: 'application/json', ...authHeader() } })
  if (!res.ok) throw new Error(`Mailpit list: HTTP ${res.status}`)
  return (await res.json()) as MailpitMessagesResponse
}

export async function mailpitGetMessage(id: string): Promise<MailpitMessageDetail> {
  const url = `${baseUrl()}/message/${encodeURIComponent(id)}`
  const res = await fetch(url, { headers: { Accept: 'application/json', ...authHeader() } })
  if (!res.ok) throw new Error(`Mailpit get: HTTP ${res.status}`)
  return (await res.json()) as MailpitMessageDetail
}

export function extractAccountCreatedGetStartedHref(message: MailpitMessageDetail): string {
  const html = message.HTML ?? ''
  const getStarted = html.match(
    /<a[^>]+href="(https:\/\/links\.info\.pdfmerges\.com[^"]+)"[^>]*>[\s\S]*?Get started![\s\S]*?<\/a>/i
  )
  if (getStarted?.[1]) return getStarted[1].replace(/&amp;/g, '&')
  const firstMarketing = html.match(/href="(https:\/\/links\.info\.pdfmerges\.com[^"]+)"/i)
  if (firstMarketing?.[1]) return firstMarketing[1].replace(/&amp;/g, '&')
  const anyHttps = html.match(/href="(https:\/\/[^"]+)"/i)
  if (anyHttps?.[1]) return anyHttps[1].replace(/&amp;/g, '&')
  throw new Error(`No se encontró CTA "Get started" / links marketing en mensaje ${message.ID}`)
}

export function extractMagicLinkFromMessage(message: MailpitMessageDetail): string {
  const html = message.HTML ?? ''
  const text = message.Text ?? ''
  const content = `${html}\n${text}`
  const cta = html.match(/<a[^>]+href="([^"]+)"[^>]*>\s*Sign\s*in\s*<\/a>/i)
  if (cta?.[1]) return cta[1]
  const urlRegex = /(https?:\/\/[^\s"'<>]+)/gi
  const urls = content.match(urlRegex) ?? []
  const candidate = urls.find((u) => !/\.(png|jpg|jpeg|gif|webp)(\?|$)/i.test(u))
  if (candidate) return candidate
  throw new Error(`No se encontró magic link en mensaje ${message.ID}`)
}

export async function waitForMagicLink(options: {
  search: string
  subjectIncludes?: string
  timeoutMs?: number
  pollEveryMs?: number
  afterMs?: number
}): Promise<string> {
  const timeoutMs = options.timeoutMs ?? 90_000
  const pollEveryMs = options.pollEveryMs ?? 1500
  const afterMs = options.afterMs ?? 0
  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    const res = await mailpitListMessages(options.search, 50)
    const msgs = (res.messages ?? []).slice().sort((a, b) => new Date(b.Created).getTime() - new Date(a.Created).getTime())

    const searchNorm = normalizeEmailForApp(options.search.trim().toLowerCase())
    const filtered = msgs.filter((m) => {
      const createdMs = new Date(m.Created).getTime()
      if (!Number.isFinite(createdMs) || createdMs < afterMs) return false
      return (m.To ?? []).some((t) => {
        const toAddr = (t?.Address ?? '').trim().toLowerCase()
        return toAddr && normalizeEmailForApp(toAddr) === searchNorm
      })
    })

    const match = options.subjectIncludes
      ? filtered.find((m) => (m.Subject ?? '').toLowerCase().includes(options.subjectIncludes!.toLowerCase()))
      : filtered[0]

    if (match) {
      const detail = await mailpitGetMessage(match.ID)
      return extractMagicLinkFromMessage(detail)
    }
    await new Promise((r) => setTimeout(r, pollEveryMs))
  }

  throw new Error(`Mailpit: sin mensaje para search="${options.search}" en ${timeoutMs}ms`)
}

export async function waitForMessageDetail(options: {
  search: string
  subjectIncludes?: string
  timeoutMs?: number
  pollEveryMs?: number
  afterMs?: number
}): Promise<MailpitMessageDetail> {
  const timeoutMs = options.timeoutMs ?? 90_000
  const pollEveryMs = options.pollEveryMs ?? 1500
  const afterMs = options.afterMs ?? 0
  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    const res = await mailpitListMessages(options.search, 50)
    const msgs = (res.messages ?? []).slice().sort((a, b) => new Date(b.Created).getTime() - new Date(a.Created).getTime())

    const searchNorm = normalizeEmailForApp(options.search.trim().toLowerCase())
    const filtered = msgs.filter((m) => {
      const createdMs = new Date(m.Created).getTime()
      if (!Number.isFinite(createdMs) || createdMs < afterMs) return false
      return (m.To ?? []).some((t) => {
        const toAddr = (t?.Address ?? '').trim().toLowerCase()
        return toAddr && normalizeEmailForApp(toAddr) === searchNorm
      })
    })

    const match = options.subjectIncludes
      ? filtered.find((m) => (m.Subject ?? '').toLowerCase().includes(options.subjectIncludes!.toLowerCase()))
      : filtered[0]

    if (match) {
      return await mailpitGetMessage(match.ID)
    }
    await new Promise((r) => setTimeout(r, pollEveryMs))
  }

  throw new Error(`Mailpit: sin mensaje (detail) para search="${options.search}" en ${timeoutMs}ms`)
}

/**
 * Espera un mensaje cuyo asunto contiene **cualquiera** de las subcadenas (útil si el producto cambia el copy del correo de pago).
 */
export async function waitForMessageDetailSubjectMatchesOne(options: {
  search: string
  subjectSubstrings: string[]
  timeoutMs?: number
  pollEveryMs?: number
  afterMs?: number
}): Promise<MailpitMessageDetail> {
  const timeoutMs = options.timeoutMs ?? 120_000
  const pollEveryMs = options.pollEveryMs ?? 1500
  const afterMs = options.afterMs ?? 0
  const subs = options.subjectSubstrings.filter(Boolean)
  if (subs.length === 0) throw new Error('subjectSubstrings vacío')
  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    const res = await mailpitListMessages(options.search, 80)
    const msgs = (res.messages ?? []).slice().sort((a, b) => new Date(b.Created).getTime() - new Date(a.Created).getTime())

    const searchNorm = normalizeEmailForApp(options.search.trim().toLowerCase())
    const filtered = msgs.filter((m) => {
      const createdMs = new Date(m.Created).getTime()
      if (!Number.isFinite(createdMs) || createdMs < afterMs) return false
      return (m.To ?? []).some((t) => {
        const toAddr = (t?.Address ?? '').trim().toLowerCase()
        return toAddr && normalizeEmailForApp(toAddr) === searchNorm
      })
    })

    const subjLower = (s: string) => s.toLowerCase()
    for (const m of filtered) {
      const subject = (m.Subject ?? '').toLowerCase()
      if (subs.some((frag) => subject.includes(subjLower(frag)))) {
        return await mailpitGetMessage(m.ID)
      }
    }
    await new Promise((r) => setTimeout(r, pollEveryMs))
  }

  throw new Error(
    `Mailpit: sin mensaje con asunto matching [${subs.join(', ')}] para search="${options.search}" en ${timeoutMs}ms`
  )
}

/** Igual idea que legacy `toCatcherEmail` para búsqueda en Mailpit. */
export function toCatcherEmail(email: string): string {
  const [local] = email.split('@')
  if (!local) return email
  return `${local}@catcher.1ecorp.net`
}

/**
 * Extrae la primera URL https del cuerpo (HTML o texto), excluyendo imágenes.
 */
export function extractFirstHttpsUrl(message: MailpitMessageDetail, opts?: { matches?: RegExp }): string | null {
  const blob = `${message.HTML ?? ''}\n${message.Text ?? ''}`
  const urls = blob.match(/https?:\/\/[^\s"'<>]+/gi) ?? []
  const filtered = urls.filter((u) => !/\.(png|jpg|jpeg|gif|webp|svg)(\?|$)/i.test(u))
  const list = opts?.matches ? filtered.filter((u) => opts.matches!.test(u)) : filtered
  return list[0] ?? null
}

/**
 * Extrae el código de verificación de 4 dígitos del correo "new document"
 * (legacy `MailpitApi.extractDocumentVerificationCode`). Cubre los principales
 * idiomas soportados por la plataforma (en/es/fr/it/pt/de/ja/pl/tr/ar/nl).
 * Mantiene el nombre `extractDownloadCode` por compatibilidad con los specs.
 */
export function extractDownloadCode(message: MailpitMessageDetail): string | null {
  const combined = `${message.HTML ?? ''}\n${message.Text ?? ''}`
  const stripped = combined.replace(/<[^>]+>/g, ' ')
  const plain = decodeHtmlEntities(stripped).replace(/\s+/g, ' ')

  const patterns: RegExp[] = [
    /verification code\s*:?\s*(\d{4})/i,
    /enter the verification code\s+(\d{4})/i,
    /code\s+(\d{4})\s+to start your download/i,
    /c[oó]digo\s+de\s+verificaci[oó]n\s*:?\s*(\d{4})/i,
    /code\s+de\s+v[eé]rification\s*:?\s*(\d{4})/i,
    /codice\s+di\s+verifica\s*:?\s*(\d{4})/i,
    /c[oó]digo\s+de\s+verifica[çc][aã]o\s*:?\s*(\d{4})/i,
    /best[äa]tigungscode\s*:?\s*(\d{4})/iu,
    /verifizierungscode\s*:?\s*(\d{4})/iu,
    /sicherheitscode\s*:?\s*(\d{4})/iu,
    /認証コード\s*:?\s*(\d{4})/,
    /kod\s+weryfikacyjny\s*:?\s*(\d{4})/i,
    /doğrulama\s+kodu\s*:?\s*(\d{4})/i,
    /رمز\s+التحقق\s*:?\s*(\d{4})/,
    /verificatiecode\s*:?\s*(\d{4})/i
  ]
  for (const re of patterns) {
    const m = plain.match(re)
    if (m?.[1]) return m[1]
  }

  const all = [...plain.matchAll(/\b(\d{4})\b/g)].map((x) => x[1])
  if (all.length === 0) return null
  const notYear = all.filter((x) => !/^(19|20)\d{2}$/.test(x))
  const pool = notYear.length > 0 ? notYear : all
  if (pool.length === 1) return pool[0]
  return pool[0] ?? null
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&([a-z]+);/gi, (_, name: string) => {
      const entities: Record<string, string> = {
        auml: 'ä',
        ouml: 'ö',
        uuml: 'ü',
        szlig: 'ß',
        amp: '&',
        lt: '<',
        gt: '>',
        quot: '"',
        apos: "'"
      }
      return entities[name.toLowerCase()] ?? `&${name};`
    })
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
}

/**
 * Subject fragments por correo y locale (Mailpit, búsqueda case-insensitive).
 * Solo se usan como hint; los tests `subjectIncludes` aceptan undefined.
 */
export const SUBJECT_FRAGMENTS: Record<string, Record<string, string>> = {
  magicLink: {
    en: 'sign in',
    es: 'iniciar sesión',
    fr: 'connexion',
    it: 'accedi',
    pt: 'entrar',
    de: 'anmelden',
    ja: 'サインイン',
    pl: 'zaloguj',
    tr: 'oturum',
    ar: 'تسجيل',
    nl: 'inloggen',
    ko: '로그인'
  },
  paymentConfirmation: {
    en: 'receipt',
    es: 'confirmación',
    fr: 'confirmation',
    it: 'conferma',
    pt: 'confirmação',
    de: 'bestätigung',
    ja: '確認',
    pl: 'potwierdzenie',
    tr: 'onay',
    ar: 'تأكيد',
    nl: 'bevestiging',
    ko: '확인'
  },
  documentSent: {
    en: 'document',
    es: 'documento',
    fr: 'document',
    it: 'documento',
    pt: 'documento',
    de: 'dokument',
    ja: 'ドキュメント',
    pl: 'dokument',
    tr: 'belge',
    ar: 'مستند',
    nl: 'document',
    ko: '문서'
  },
  subscriptionCancellation: {
    en: 'cancel',
    es: 'cancelación',
    fr: 'annulation',
    it: 'cancellazione',
    pt: 'cancelamento',
    de: 'kündigung',
    ja: 'キャンセル',
    pl: 'anulowanie',
    tr: 'iptal',
    ar: 'إلغاء',
    nl: 'opzegging',
    ko: '취소'
  }
}

export function subjectFragmentFor(kind: keyof typeof SUBJECT_FRAGMENTS, locale: string): string {
  const table = SUBJECT_FRAGMENTS[kind]
  return table[locale.toLowerCase()] ?? table.en
}
