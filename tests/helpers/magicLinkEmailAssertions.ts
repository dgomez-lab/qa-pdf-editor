import { expect } from '@playwright/test'
import type { MailpitMessageDetail } from './mailpitClient'

const MAGIC_LINK_HEADLINE_BY_LOCALE: Record<string, string> = {
  en: 'Your sign in link',
  es: 'Tu enlace para iniciar sesión',
  fr: 'Votre lien de connexion',
  it: 'Il tuo link di accesso',
  pt: 'Seu link de acesso',
  de: 'Dein Anmeldelink',
  ja: 'サインイン用リンク',
  pl: 'Link do logowania',
  tr: 'Oturum açma bağlantınız',
  ar: 'رابط تسجيل الدخول الخاص بك',
  nl: 'Je inlog-link'
}

function normalizedEmailBody(html?: string, text?: string): string {
  const raw = `${html ?? ''}\n${text ?? ''}`
    .replace(/&nbsp;/gi, ' ')
    .replace(/&([a-z]+);/gi, (_, name: string) => {
      const entities: Record<string, string> = {
        amp: '&',
        lt: '<',
        gt: '>',
        quot: '"',
        apos: "'",
        rsquo: '\u2019',
        lsquo: '\u2018'
      }
      return entities[name.toLowerCase()] ?? `&${name};`
    })
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function assertMagicLinkEmailInExpectedLanguage(
  detail: MailpitMessageDetail | { HTML?: string; Text?: string },
  locale: string
): void {
  expect(detail.HTML || detail.Text, 'No magic link email content').toBeTruthy()
  const normalizedContent = normalizedEmailBody(detail.HTML, detail.Text)
  const loc = locale.trim().toLowerCase() || 'en'
  const headline = MAGIC_LINK_HEADLINE_BY_LOCALE[loc] ?? MAGIC_LINK_HEADLINE_BY_LOCALE.en
  expect(headline, `Unknown locale for magic link headline: ${loc}`).toBeTruthy()
  expect(normalizedContent).toContain(headline!)
}
