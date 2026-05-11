import { expect } from '@playwright/test'
import type { MailpitMessageDetail } from './mailpitClient'
import { extractAccountCreatedGetStartedHref, toCatcherEmail } from './mailpitClient'
import { normalizeEmailForApp } from './emailNormalize'

/** Substring en asunto (Mailpit, case-insensitive). Igual que legacy `accountCreatedEmailSteps.ts`. */
export const ACCOUNT_CREATED_SUBJECT_FRAGMENT: Record<string, string> = {
  en: 'account created',
  es: 'Creación de una cuenta',
  fr: 'Compte créé',
  it: 'Account creato',
  pt: 'Conta criada com sucesso',
  de: 'Konto erstellt',
  ja: 'アカウントが作成されました',
  pl: 'Utworzono bezpłatne konto',
  tr: 'Ücretsiz hesap oluşturuldu',
  ar: 'تم إنشاء الحساب المجاني',
  nl: 'Gratis account aangemaakt',
  ko: '\uBB34\uB8CC \uACC4\uC815 \uC0DD\uC131\uB428'
}

const ACCOUNT_CREATED_WELCOME_LINE: Record<string, string> = {
  en: 'Welcome!',
  es: '¡Te damos la bienvenida!',
  fr: 'Bienvenue !',
  it: 'Benvenuto!',
  pt: 'Olá!',
  de: 'Willkommen!',
  ja: 'ようこそ！',
  pl: 'Witaj!',
  tr: 'Hoş Geldiniz!',
  ar: 'مرحبًا.',
  nl: 'Welkom!',
  ko: '\uC5B4\uC11C\uC624\uC138\uC694!'
}

function plainTextFromMessage(html?: string, text?: string): string {
  const raw = `${html ?? ''}\n${text ?? ''}`
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function subjectFragmentForLocale(loc: string): string {
  return ACCOUNT_CREATED_SUBJECT_FRAGMENT[loc] ?? ACCOUNT_CREATED_SUBJECT_FRAGMENT.en
}

export function assertAccountCreatedEmail(detail: MailpitMessageDetail, locale: string, registrationEmail: string): void {
  const loc = locale.trim().toLowerCase()
  const fragment = subjectFragmentForLocale(loc)
  expect((detail.Subject ?? '').toLowerCase(), `asunto locale ${loc}`).toContain(fragment.toLowerCase())

  const catcherOrOriginal = registrationEmail.includes('@catcher.1ecorp.net')
    ? registrationEmail
    : toCatcherEmail(registrationEmail)
  const expectedInBody = normalizeEmailForApp(catcherOrOriginal)
  const normalized = plainTextFromMessage(detail.HTML, detail.Text)
  const welcome = ACCOUNT_CREATED_WELCOME_LINE[loc] ?? ACCOUNT_CREATED_WELCOME_LINE.en

  expect(normalized, `cuerpo welcome ${loc}`).toContain(welcome)
  expect(normalized, `cuerpo email ${expectedInBody}`).toContain(expectedInBody)

  const ctaUrl = extractAccountCreatedGetStartedHref(detail)
  expect(ctaUrl, 'CTA marketing').toMatch(/^https:\/\//)
}
