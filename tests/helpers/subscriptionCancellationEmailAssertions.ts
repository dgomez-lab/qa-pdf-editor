import { expect } from '@playwright/test'
import type { MailpitMessageDetail } from './mailpitClient'
import { normalizeEmailForApp } from './emailNormalize'
import { toCatcherEmail } from './mailpitClient'

const UNSUBSCRIBE_SUBJECT_FRAGMENT: Record<string, string> = {
  en: 'subscription cancellation',
  es: 'cancelación de suscripción',
  fr: 'annulation d',
  it: 'cancellazione dell',
  pt: 'cancelamento de assinatura',
  de: 'abo-kündigung',
  ja: 'サブスクリプションのキャンセル',
  pl: 'anulowanie subskrypcji',
  tr: 'abonelik iptali',
  ar: 'إلغاء الاشتراك',
  nl: 'abonnement opzeggen',
  ko: '\uAD6C\uB3C5 \uCDE8\uC18C'
}

const UNSUBSCRIBE_OPENING_LINE: Record<string, string> = {
  en: 'So sad to see you go',
  es: '¡Qué pena que te vayas!',
  fr: 'Si triste de vous voir partir',
  it: 'Che tristezza vederti andare via',
  pt: 'Que triste você ir embora',
  de: 'Schade, dich gehen zu sehen',
  ja: 'キャンセルのご希望はとても残念です',
  pl: 'Przykro nam, że odchodzisz',
  tr: 'Ayrılmanıza çok üzüldük',
  ar: 'نحن في غاية الحزن لرؤيتك ترحل',
  nl: 'Wat jammer dat je weggaat',
  ko: '\uB5A0\uB098\uC2E0\uB2E4\uB2C8 \uC27D\uC2B5\uB2C8\uB2E4'
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&([a-z]+);/gi, (_, name: string) => {
      const entities: Record<string, string> = {
        ccedil: 'ç',
        scedil: 'ş',
        iacute: 'í',
        eacute: 'é',
        oacute: 'ó',
        uacute: 'ú',
        ntilde: 'ñ',
        aacute: 'á',
        agrave: 'à',
        egrave: 'è',
        igrave: 'ì',
        ograve: 'ò',
        ugrave: 'ù',
        uuml: 'ü',
        ouml: 'ö',
        auml: 'ä',
        szlig: 'ß',
        euro: '€',
        rsquo: '\u2019',
        lsquo: '\u2018',
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

function bcp47ForLocale(loc: string): string {
  const map: Record<string, string> = {
    en: 'en-GB',
    es: 'es-ES',
    fr: 'fr-FR',
    it: 'it-IT',
    pt: 'pt-PT',
    de: 'de-DE',
    ja: 'ja-JP',
    pl: 'pl-PL',
    tr: 'tr-TR',
    ar: 'ar',
    nl: 'nl-NL',
    ko: 'ko-KR'
  }
  return map[loc] ?? loc
}

function accessUntilDateFromPurchaseMs(purchaseMs: number): Date {
  const d = new Date(purchaseMs)
  const until = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  until.setDate(until.getDate() + 7)
  return until
}

function formatAccessUntilInEmail(purchaseMs: number, loc: string): string {
  const until = accessUntilDateFromPurchaseMs(purchaseMs)
  return new Intl.DateTimeFormat(bcp47ForLocale(loc), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    numberingSystem: 'latn'
  }).format(until)
}

function accessUntilDateStringsToMatch(purchaseMs: number, loc: string): string[] {
  const localized = formatAccessUntilInEmail(purchaseMs, loc)
  const english = formatAccessUntilInEmail(purchaseMs, 'en')
  return [...new Set([localized, english])]
}

function normalizedEmailBody(html?: string, text?: string): string {
  const raw = decodeHtmlEntities(`${html ?? ''}\n${text ?? ''}`)
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normQuotes(s: string): string {
  return s.replace(/\u2019/g, "'").replace(/\u2018/g, "'")
}

export function assertSubscriptionCancellationEmailLocalized(
  detail: MailpitMessageDetail,
  options: { locale: string; registrationEmail: string; subscriptionPurchaseDateMs?: number }
): void {
  expect(detail.HTML || detail.Text, 'No subscription cancellation email loaded from Mailpit').toBeTruthy()

  const loc = options.locale.trim().toLowerCase() || 'en'
  const purchaseMs = options.subscriptionPurchaseDateMs ?? Date.now()
  const dateCandidates = accessUntilDateStringsToMatch(purchaseMs, loc)

  const catcherOrOriginal = options.registrationEmail.includes('@catcher.1ecorp.net')
    ? options.registrationEmail
    : toCatcherEmail(options.registrationEmail)
  const expectedInBody = normalizeEmailForApp(catcherOrOriginal)
  const normalized = normalizedEmailBody(detail.HTML, detail.Text)

  const subjectFrag = UNSUBSCRIBE_SUBJECT_FRAGMENT[loc] ?? UNSUBSCRIBE_SUBJECT_FRAGMENT.en
  expect((detail.Subject ?? '').toLowerCase()).toContain(subjectFrag.toLowerCase())

  const opening = UNSUBSCRIBE_OPENING_LINE[loc] ?? UNSUBSCRIBE_OPENING_LINE.en
  expect(normQuotes(normalized)).toContain(normQuotes(opening))

  expect(normalized).toContain('Full Access')
  expect(normalized).toContain(expectedInBody)

  const dateMatched = dateCandidates.find((d) => normalized.includes(d))
  expect(dateMatched, `Body should contain access-until date; tried: ${dateCandidates.join(' | ')}`).toBeTruthy()
}
