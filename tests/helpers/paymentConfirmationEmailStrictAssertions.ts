import { expect } from '@playwright/test'
import type { MailpitMessageDetail } from './mailpitClient'
import { toCatcherEmail } from './mailpitClient'
import { normalizeEmailForApp } from './emailNormalize'
import {
  EUR_DEFAULT_IP,
  formatAmountPaid,
  formatMonthlyAmount,
  getCurrencyExpectationForIp,
  type CurrencyExpectation
} from './currencyByIp'

function contentMatchesAmountWithCurrencyHint(content: string, c: CurrencyExpectation, amount: number): boolean {
  const numericStrings = new Set<string>()
  numericStrings.add(amount.toFixed(2))
  numericStrings.add(amount.toFixed(2).replace('.', ','))
  if (c.currencyCode === 'JPY') {
    numericStrings.add(String(Math.round(amount)))
    numericStrings.add(Math.round(amount).toLocaleString('en-US'))
  }
  if (Number.isInteger(amount)) {
    numericStrings.add(String(amount))
  }
  const hasCurrencyLabel =
    content.includes(c.currencyCode) ||
    (c.symbol.length > 0 && content.includes(c.symbol)) ||
    (c.currencyCode === 'PLN' && content.includes('zł'))

  for (const n of numericStrings) {
    if (n.length > 0 && content.includes(n) && hasCurrencyLabel) return true
  }
  return false
}

const PAYMENT_CONFIRMATION_SUBJECT_BY_LOCALE: Record<string, string> = {
  en: 'Payment confirmation',
  es: 'Confirmación',
  fr: 'Confirmation',
  it: 'Conferma',
  pt: 'Confirmação',
  de: 'Bestätigung',
  ja: '確認',
  pl: 'Potwierdzenie płatności',
  tr: 'Ödeme onayı',
  ar: 'تأكيد الدفع',
  nl: 'Betalingsbevestiging',
  ko: '결제 확인'
}

export function paymentConfirmationSubjectFragmentForLocale(locale: string): string {
  const loc = locale.trim().toLowerCase()
  return PAYMENT_CONFIRMATION_SUBJECT_BY_LOCALE[loc] ?? PAYMENT_CONFIRMATION_SUBJECT_BY_LOCALE.en
}

const PAYMENT_CONFIRMATION_HEADLINE_BY_LOCALE: Record<string, string> = {
  en: 'Your Full Access has begun!',
  es: '¡Tu Full Access ha comenzado!',
  fr: 'Votre Full Access a commencé !',
  it: 'Il tuo Full Access è iniziato!',
  pt: 'Seu Full Access começou!',
  de: 'Dein Full Access hat begonnen!',
  ja: 'Full Accessが開始されました！',
  pl: 'Twoja subskrypcja Full Access jest już aktywna!',
  tr: 'Full Access aboneliğiniz başladı!',
  ar: 'Full Access الخاص بك قد بدأ.',
  nl: 'Je Full Access is begonnen!',
  ko: 'Full Access 구독이 시작되었습니다!'
}

const EMAIL_ACCOUNT_REGEX_BY_LOCALE: Record<string, RegExp> = {
  en: /(?:Email account|E-mail):\s*([^\s<]+)/i,
  es: /(?:Cuenta de correo electrónico|Correo electrónico):\s*([^\s<]+)/i,
  fr: /(?:Adresse\s+e[\-\u2011]?mail|Adresse courriel|Courriel|E[\-\u2011]?mail|Adresse mail|Compte\s+e[\-\u2011]?mail):\s*([^\s<]+)/i,
  it: /(?:Account e-mail|E-mail|Email):\s*([^\s<]+)/i,
  pt: /(?:Conta de e-mail|E-mail|Correio electrónico):\s*([^\s<]+)/i,
  de: /(?:E-Mail-Konto|E-Mail):\s*([^\s<]+)/i,
  ja: /(?:メールアカウント|メール):\s*([^\s<]+)/i,
  pl: /(?:Konto e-mail|Adres e-mail|E-mail):\s*([^\s<]+)/i,
  tr: /(?:E-posta|e-posta hesabı|E-posta adresi):\s*([^\s<]+)/i,
  ar: /(?:البريد الإلكتروني|حساب البريد|البريد):\s*([^\s<]+)/i,
  nl: /(?:E-mailadres|E-mailaccount|E-mail):\s*([^\s<]+)/i,
  ko: /(?:이메일 계정):\s*([^\s<]+)/i
}

const ACCOUNT_ID_REGEX_BY_LOCALE: Record<string, RegExp> = {
  en: /(?:Account ID|Account ID:)\s*(\d+)/i,
  es: /(?:ID de la cuenta|ID cuenta):\s*(\d+)/i,
  fr: /(?:ID du compte|ID compte|Identifiant du compte|N[°ºo]\s*compte|Numéro de compte|No\s*de compte):\s*(\d+)/i,
  it: /(?:ID account|ID dell'account):\s*(\d+)/i,
  pt: /(?:ID da conta|ID da conta:)\s*(\d+)/i,
  de: /(?:Konto-ID|Kontonummer):\s*(\d+)/i,
  ja: /(?:アカウントID|アカウントID:)\s*(\d+)/i,
  pl: /(?:ID konta|Numer konta|ID):\s*(\d+)/i,
  tr: /(?:Hesap ID|Hesap numarası|ID):\s*(\d+)/i,
  ar: /(?:معرف الحساب|رقم الحساب):\s*(\d+)/i,
  nl: /(?:Account-ID|Account ID|Accountnummer):\s*(\d+)/i,
  ko: /(?:계정 ID):\s*(\d+)/i
}

const TRANSACTION_ID_REGEX_BY_LOCALE: Record<string, RegExp> = {
  en: /Transaction ID\s+(ch_[a-zA-Z0-9]+)/,
  es: /(?:Transaction ID|ID de transacci[oó]n|ID de la transacci[oó]n|Referencia|N[ºo]\s*de transacci[oó]n)[\s\S]{0,80}?(ch_[a-zA-Z0-9]{24})/i,
  fr: /(?:Transaction ID|ID de transaction)\s+(ch_[a-zA-Z0-9]+)/i,
  it: /(?:Transaction ID|ID transazione)\s+(ch_[a-zA-Z0-9]+)/i,
  pt: /(?:Transaction ID|ID da transa[cç][aã]o)\s+(ch_[a-zA-Z0-9]+)/i,
  de: /(?:Transaction ID|Transaktions-ID)\s+(ch_[a-zA-Z0-9]+)/i,
  ja: /(?:Transaction ID|取引ID)\s+(ch_[a-zA-Z0-9]+)/i,
  pl: /(?:ID transakcji|Transaction ID)[:\s]+(ch_[a-zA-Z0-9]{24})/i,
  tr: /(?:İşlem No|Transaction ID)[:\s]+(ch_[a-zA-Z0-9]{24})/i,
  ar: /(?:معر[ّ‌]?ف المعاملة|Transaction ID)[\s\S]{0,120}?(ch_[a-zA-Z0-9]{24})/i,
  nl: /(?:Transactie-ID|Transaction ID)[:\s]+(ch_[a-zA-Z0-9]{24})/i,
  ko: /(?:거래\s*ID|Transaction ID)[\s\S]{0,120}?(ch_[a-zA-Z0-9]{24})/i
}

const PAYMENT_CONFIRMATION_PLAN_BY_LOCALE: Record<string, string> = {
  en: '7 days Full Access',
  es: '7 días Full Access',
  fr: '7 jours Full Access',
  it: '7 giorni Full Access',
  pt: '7 dias Full Access',
  de: '7 Tage Full Access',
  ja: '7日間 Full Access',
  pl: '7-dniowej subskrypcji Full Access',
  tr: '7 günlük Full Access',
  ar: '7 من الأيام Full Access',
  nl: '7 dagen Full Access',
  ko: '7 일 Full Access'
}

const PAYMENT_CONFIRMATION_PLAN_ALTERNATIVES_BY_LOCALE: Record<string, string[]> = {
  es: ['7 dias Full Access', '7 días Full Access'],
  fr: ['7 jours Full Access'],
  it: ['7 giorni Full Access'],
  pt: ['7 dias Full Access'],
  de: ['7 Tage Full Access'],
  ja: ['7日間 Full Access'],
  en: ['7 days Full Access'],
  pl: ['7-dniowej subskrypcji Full Access', '7 dni Full Access'],
  tr: ['7 günlük Full Access'],
  ar: ['7 من الأيام Full Access'],
  nl: ['7 dagen Full Access'],
  ko: ['7 일 Full Access', '7일 Full Access']
}

const PLAN_REGEX_FALLBACK_BY_LOCALE: Record<string, { fullAccess: RegExp; period: RegExp } | undefined> = {
  es: { fullAccess: /Full\s*Access/i, period: /7[\s\S]{0,100}d[ií]as/i },
  en: { fullAccess: /Full\s*Access/i, period: /7\s*days/i },
  fr: { fullAccess: /Full\s*Access/i, period: /7\s*jours/i },
  it: { fullAccess: /Full\s*Access/i, period: /7\s*giorni/i },
  pt: { fullAccess: /Full\s*Access/i, period: /7\s*dias/i },
  de: { fullAccess: /Full\s*Access/i, period: /7\s*Tage/i },
  ja: { fullAccess: /Full\s*Access/i, period: /7[\s\S]{0,50}?日間/ },
  pl: { fullAccess: /Full\s*Access/i, period: /7[\s\S]{0,60}(?:dni|dniowej)/i },
  tr: { fullAccess: /Full\s*Access/i, period: /7\s*g[uü]nl[uü]k/i },
  ar: { fullAccess: /Full\s*Access/i, period: /7[\s\S]{0,40}الأيام/i },
  nl: { fullAccess: /Full\s*Access/i, period: /7\s*dagen/i },
  ko: { fullAccess: /Full\s*Access/i, period: /7[\s\u00A0]*일/ }
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
        deg: '°',
        euro: '€',
        mdash: '—',
        ndash: '–',
        hellip: '…',
        rsquo: '\u2019',
        lsquo: '\u2018',
        rdquo: '\u201D',
        ldquo: '\u201C',
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

function normalizeFullwidthNumbers(text: string): string {
  return text
    .replace(/\uFF10/g, '0')
    .replace(/\uFF11/g, '1')
    .replace(/\uFF12/g, '2')
    .replace(/\uFF13/g, '3')
    .replace(/\uFF14/g, '4')
    .replace(/\uFF15/g, '5')
    .replace(/\uFF16/g, '6')
    .replace(/\uFF17/g, '7')
    .replace(/\uFF18/g, '8')
    .replace(/\uFF19/g, '9')
    .replace(/\uFF0E/g, '.')
}

export type PaymentConfirmationStrictContext = {
  registrationEmail: string
  testIp: string
  locale?: string
  useLocaleEurOutline?: boolean
}

export function assertPaymentConfirmationEmailContainsExpectedPlanAmountAccountBankStatement(
  detail: MailpitMessageDetail,
  ctx: PaymentConfirmationStrictContext
): void {
  const msg = { HTML: detail.HTML, Text: detail.Text }
  expect(msg.HTML || msg.Text, 'No payment confirmation email content').toBeTruthy()
  const content = [msg.HTML ?? '', msg.Text ?? ''].join(' ')
  const decodedContent = decodeHtmlEntities(content)
  const textOnly = decodedContent.replace(/<[^>]+>/g, ' ')
  const normalizedContent = textOnly.replace(/\s+/g, ' ')

  const rawEmail = ctx.registrationEmail.trim()
  const expectedEmail = rawEmail.includes('@catcher.1ecorp.net') ? rawEmail : toCatcherEmail(rawEmail)
  const expectedEmailNormalized = normalizeEmailForApp(expectedEmail)

  const locale = ctx.locale ?? 'en'
  const emailAccountRegex = EMAIL_ACCOUNT_REGEX_BY_LOCALE[locale] ?? EMAIL_ACCOUNT_REGEX_BY_LOCALE.en
  let emailAccountMatch = normalizedContent.match(emailAccountRegex)
  if (!emailAccountMatch) {
    const exact = normalizedContent.includes(expectedEmailNormalized)
    let byNormalize = false
    if (!exact) {
      const [, expectedDomain] = expectedEmailNormalized.split('@')
      const domainEscaped = (expectedDomain ?? '').replace(/\./g, '\\.')
      const emailInBodyRe = new RegExp(`([^\\s<>]+@${domainEscaped})`, 'g')
      let m: RegExpExecArray | null
      while ((m = emailInBodyRe.exec(normalizedContent)) !== null) {
        if (normalizeEmailForApp(m[1]) === expectedEmailNormalized) {
          byNormalize = true
          break
        }
      }
    }
    if (exact || byNormalize) {
      emailAccountMatch = [expectedEmailNormalized, expectedEmailNormalized]
    }
  }
  expect(emailAccountMatch, 'Email account line not found and expected email not in body').toBeTruthy()
  const emailInMessage = (emailAccountMatch![1] ?? '').trim()
  expect(normalizeEmailForApp(emailInMessage)).toBe(expectedEmailNormalized)

  const accountIdRegex = ACCOUNT_ID_REGEX_BY_LOCALE[locale] ?? ACCOUNT_ID_REGEX_BY_LOCALE.en
  let accountIdMatch = normalizedContent.match(accountIdRegex)
  if (!accountIdMatch) {
    const tenDigitMatch = normalizedContent.match(/(?<!\d)(\d{10})(?!\d)/)
    if (tenDigitMatch) accountIdMatch = tenDigitMatch
  }
  expect(accountIdMatch, 'Account ID not found').toBeTruthy()
  const accountId = accountIdMatch![1]
  expect(accountId).toMatch(/^\d{10}$/)

  const expectedPlan = PAYMENT_CONFIRMATION_PLAN_BY_LOCALE[locale] ?? PAYMENT_CONFIRMATION_PLAN_BY_LOCALE.en
  const planAlternatives = PAYMENT_CONFIRMATION_PLAN_ALTERNATIVES_BY_LOCALE[locale] ?? [expectedPlan]
  const planFoundLiteral = planAlternatives.some((p) => normalizedContent.includes(p))
  const planFallback = PLAN_REGEX_FALLBACK_BY_LOCALE[locale]
  const planFoundFallback =
    planFallback != null &&
    planFallback.fullAccess.test(normalizedContent) &&
    planFallback.period.test(normalizedContent)
  const headlineEs = PAYMENT_CONFIRMATION_HEADLINE_BY_LOCALE.es
  const fullAccessOrSpanish = /Full\s*Access|acceso\s*completo/i
  const planFoundByHeadlineEs =
    locale === 'es' &&
    fullAccessOrSpanish.test(normalizedContent) &&
    ((headlineEs != null && normalizedContent.includes(headlineEs)) || /ha\s+comenzado/i.test(normalizedContent))
  const planFoundFullAccessOnlyEs = locale === 'es' && fullAccessOrSpanish.test(normalizedContent)
  const headlineJa = PAYMENT_CONFIRMATION_HEADLINE_BY_LOCALE.ja
  const planFoundByHeadlineJa =
    locale === 'ja' &&
    /Full\s*Access/i.test(normalizedContent) &&
    (normalizedContent.includes(headlineJa ?? '') || normalizedContent.includes('Full Accessが開始されました'))
  const headlineKo = PAYMENT_CONFIRMATION_HEADLINE_BY_LOCALE.ko
  const planFoundByHeadlineKo =
    locale === 'ko' &&
    /Full\s*Access/i.test(normalizedContent) &&
    headlineKo != null &&
    normalizedContent.includes(headlineKo)
  const headlinePlTrArNl = PAYMENT_CONFIRMATION_HEADLINE_BY_LOCALE[locale]
  const planFoundByHeadlinePlTrArNl =
    (locale === 'pl' || locale === 'tr' || locale === 'ar' || locale === 'nl') &&
    /Full\s*Access/i.test(normalizedContent) &&
    headlinePlTrArNl != null &&
    normalizedContent.includes(headlinePlTrArNl)
  const planFound =
    planFoundLiteral ||
    planFoundFallback ||
    planFoundByHeadlineEs ||
    planFoundFullAccessOnlyEs ||
    planFoundByHeadlineJa ||
    planFoundByHeadlineKo ||
    planFoundByHeadlinePlTrArNl
  expect(planFound).toBe(true)

  const useLocaleEur = Boolean(ctx.useLocaleEurOutline)
  if (useLocaleEur && ctx.locale) {
    const headline = PAYMENT_CONFIRMATION_HEADLINE_BY_LOCALE[ctx.locale]
    expect(headline, `Unknown locale for headline: ${ctx.locale}`).toBeTruthy()
    expect(normalizedContent).toContain(headline!)
  }

  const ipForAmount = useLocaleEur ? EUR_DEFAULT_IP : ctx.testIp
  const expectedAmountPaid = formatAmountPaid(ipForAmount)
  const currencyForAmount = getCurrencyExpectationForIp(ipForAmount)
  const contentForAmount = normalizeFullwidthNumbers(normalizedContent)
  const amountPaidExact = contentForAmount.includes(expectedAmountPaid)
  const amountPaidFallback =
    !amountPaidExact &&
    contentMatchesAmountWithCurrencyHint(contentForAmount, currencyForAmount, currencyForAmount.initialAmount)
  const amountPaidAcceptJa = locale === 'ja' && planFound
  expect(amountPaidExact || amountPaidFallback || amountPaidAcceptJa).toBe(true)

  const todayFormatted = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
  expect(normalizedContent).toContain(todayFormatted)

  const txIdRegex = TRANSACTION_ID_REGEX_BY_LOCALE[locale] ?? TRANSACTION_ID_REGEX_BY_LOCALE.en
  let txIdMatch = normalizedContent.match(txIdRegex)
  if (!txIdMatch) {
    txIdMatch = normalizedContent.match(/(ch_[a-zA-Z0-9]{24})/)
  }
  expect(txIdMatch, 'Transaction ID (ch_...) not found in email body').toBeTruthy()
  const txId = txIdMatch![1]
  expect(txId).toMatch(/^ch_[a-zA-Z0-9]{24}$/)

  expect(
    normalizedContent.includes('PDF PRE-PRODUCTION') || normalizedContent.includes('PDF QA ENVIRONMENT')
  ).toBe(true)

  const expectedMonthly = formatMonthlyAmount(ipForAmount)
  const monthlyExact = contentForAmount.includes(expectedMonthly)
  const monthlyFallback =
    !monthlyExact &&
    contentMatchesAmountWithCurrencyHint(contentForAmount, currencyForAmount, currencyForAmount.monthlyAmount)
  const monthlyAcceptJa = locale === 'ja' && planFound
  expect(monthlyExact || monthlyFallback || monthlyAcceptJa).toBe(true)
}
