Feature: Transactional emails

  Scenario Outline: Account created email after registration from login in <locale>
    Given I set this test to start with the following data:
      | flow      | ip | locale  |
      | Dashboard | ES | <locale>|
    When I am in Login page in the current test locale
    And I register a new user from login tracking account creation email
    And I wait for the account created email in Mailpit
    Then the account created email contains expected welcome content and get started CTA

    @PDFEDITOR_TRANSACTIONAL_EMAIL_ACCOUNT_CREATED_EN
    Examples: Account created email in English
      | locale |
      | en     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_ACCOUNT_CREATED_ES
    Examples: Account created email in Spanish
      | locale |
      | es     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_ACCOUNT_CREATED_FR
    Examples: Account created email in French
      | locale |
      | fr     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_ACCOUNT_CREATED_IT
    Examples: Account created email in Italian
      | locale |
      | it     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_ACCOUNT_CREATED_PT
    Examples: Account created email in Portuguese
      | locale |
      | pt     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_ACCOUNT_CREATED_DE
    Examples: Account created email in German
      | locale |
      | de     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_ACCOUNT_CREATED_JA
    Examples: Account created email in Japanese
      | locale |
      | ja     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_ACCOUNT_CREATED_PL
    Examples: Account created email in Polish
      | locale |
      | pl     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_ACCOUNT_CREATED_TR
    Examples: Account created email in Turkish
      | locale |
      | tr     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_ACCOUNT_CREATED_AR
    Examples: Account created email in Arabic
      | locale |
      | ar     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_ACCOUNT_CREATED_NL
    Examples: Account created email in Dutch
      | locale |
      | nl     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_ACCOUNT_CREATED_KO
    Examples: Account created email in Korean
      | locale |
      | ko     |

  Scenario Outline: Payment confirmation email for <currency> with IP <ip>
    Given I set this test to start with the following data:
      | flow    | ip   |
      | Default | <ip> |
    And I am in Home page
    And I force URL with parameters
          """
          { "ip": "<ip>" }
          """
    When I wait 1 seconds
    Then I upload a PDF document
    And I am redirected to editor page
    And I click next button
    And I create a new user from the editor
    And I wait for element <element>
    And I wait 1 seconds
    And The text of element <element> should contain <price>
    And The text of element <monthly element> should contain <monthly price editor>
    And I make the initial payment
    And I save my document
    And I am redirected to Dashboard page
    And I wait for element onboarding close modal button
    And I click element onboarding close modal button
    And I click element onboarding close modal button
    When I wait for the payment confirmation email for the current user
    Then the payment confirmation email contains the expected plan, amount, account and bank statement details

    @PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION_USD
    Examples: Payment confirmation email in USD (US)
      | ip | currency | element                | monthly element                | monthly price editor | price  |
      | US | USD      | transaction price text | transaction monthly price text | $49.95               | $1.95  |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION_EUR
    Examples: Payment confirmation email in EUR (ES)
      | ip | currency | element                | monthly element                | monthly price editor | price  |
      | ES | EUR      | transaction price text | transaction monthly price text | €49.95               | €1.95  |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION_CAD
    Examples: Payment confirmation email in CAD (CA)
      | ip | currency | element                | monthly element                | monthly price editor | price  |
      | CA | CAD      | transaction price text | transaction monthly price text | $49.95               | $2.95  |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION_AUD
    Examples: Payment confirmation email in AUD (AU)
      | ip | currency | element                | monthly element                | monthly price editor | price  |
      | AU | AUD      | transaction price text | transaction monthly price text | $49.95               | $2.95  |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION_GBP
    Examples: Payment confirmation email in GBP (GB)
      | ip | currency | element                | monthly element                | monthly price editor | price  |
      | GB | GBP      | transaction price text | transaction monthly price text | £49.95               | £1.95  |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION_JPY
    Examples: Payment confirmation email in JPY (JP)
      | ip | currency | element                | monthly element                | monthly price editor | price  |
      | JP | JPY      | transaction price text | transaction monthly price text | ¥7500.00             | ¥300   |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION_BRL
    Examples: Payment confirmation email in BRL (BR)
      | ip | currency | element                | monthly element                | monthly price editor | price   |
      | BR | BRL      | transaction price text | transaction monthly price text | R$229,00             | R$9,90  |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION_TRY
    Examples: Payment confirmation email in TRY (TR)
      | ip | currency | element                | monthly element                | monthly price editor | price    |
      | TR | TRY      | transaction price text | transaction monthly price text | ₺999,00              | ₺59,00   |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION_PLN
    Examples: Payment confirmation email in PLN (PL)
      | ip | currency | element                | monthly element                | monthly price editor | price    |
      | PL | PLN      | transaction price text | transaction monthly price text | 149,00 zł            | 7,90 zł  |

  Scenario Outline: Payment confirmation email in <locale> (EUR, localized headline)
    Given I set this test to start with the following data:
      | flow    | ip | locale  |
      | Default | ES | <locale>|
    And I am in Home page in locale <locale>
    And I force URL with parameters
          """
          { "ip": "ES" }
          """
    When I wait 1 seconds
    Then I upload a PDF document
    And I am redirected to editor page
    And I click next button
    And I create a new user from the editor
    And I wait for element transaction price text
    And I wait 1 seconds
    And The text of element transaction price text should contain €1.95
    And The text of element transaction monthly price text should contain €49.95
    And I make the initial payment
    And I save my document
    And I am redirected to Dashboard page
    And I wait for element onboarding close modal button
    And I click element onboarding close modal button
    And I click element onboarding close modal button
    When I wait for the payment confirmation email for the current user
    Then the payment confirmation email contains the expected plan, amount, account and bank statement details

    @PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION_EN
    Examples: Payment confirmation email in English (EUR, localized headline)
      | locale |
      | en     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION_LOCALE_ES
    Examples: Payment confirmation email in Spanish (EUR, localized headline)
      | locale |
      | es     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION_LOCALE_FR
    Examples: Payment confirmation email in French (EUR, localized headline)
      | locale |
      | fr     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION_LOCALE_IT
    Examples: Payment confirmation email in Italian (EUR, localized headline)
      | locale |
      | it     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION_LOCALE_PT
    Examples: Payment confirmation email in Portuguese (EUR, localized headline)
      | locale |
      | pt     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION_LOCALE_DE
    Examples: Payment confirmation email in German (EUR, localized headline)
      | locale |
      | de     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION_LOCALE_JA
    Examples: Payment confirmation email in Japanese (EUR, localized headline)
      | locale |
      | ja     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION_LOCALE_PL
    Examples: Payment confirmation email in Polish (EUR, localized headline)
      | locale |
      | pl     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION_LOCALE_TR
    Examples: Payment confirmation email in Turkish (EUR, localized headline)
      | locale |
      | tr     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION_LOCALE_AR
    Examples: Payment confirmation email in Arabic (EUR, localized headline)
      | locale |
      | ar     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION_LOCALE_NL
    Examples: Payment confirmation email in Dutch (EUR, localized headline)
      | locale |
      | nl     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_PAYMENT_CONFIRMATION_LOCALE_KO
    Examples: Payment confirmation email in Korean (EUR, localized headline)
      | locale |
      | ko     |

  Scenario Outline: After first payment, send document via email and complete download with code from Mailpit (<locale>)
    Given I set this test to start with the following data:
      | flow    | locale  |
      | Default | <locale>|
    And I am in Editor page
    And I click next button
    And I create a new user from the editor
    And I make the initial payment
    And I wait for element pdf radio button
    When I send the document to the registration email from the payment success modal
    And I wait for the mergedpdf new document email in Mailpit
    And I open the download URL from the mergedpdf document email
    And I am redirected to Downloads page
    And I enter the mergedpdf document verification code into download code input
    When I trigger the mergedpdf document download from the downloads page
    Then the browser url should contain downloads

    @PDFEDITOR_TRANSACTIONAL_EMAIL_DOCUMENT_SENT_EN
    Examples: Document sent email + download (English)
      | locale |
      | en     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_DOCUMENT_SENT_ES
    Examples: Document sent email + download (Spanish)
      | locale |
      | es     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_DOCUMENT_SENT_FR
    Examples: Document sent email + download (French)
      | locale |
      | fr     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_DOCUMENT_SENT_IT
    Examples: Document sent email + download (Italian)
      | locale |
      | it     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_DOCUMENT_SENT_PT
    Examples: Document sent email + download (Portuguese)
      | locale |
      | pt     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_DOCUMENT_SENT_DE
    Examples: Document sent email + download (German)
      | locale |
      | de     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_DOCUMENT_SENT_JA
    Examples: Document sent email + download (Japanese)
      | locale |
      | ja     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_DOCUMENT_SENT_PL
    Examples: Document sent email + download (Polish)
      | locale |
      | pl     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_DOCUMENT_SENT_TR
    Examples: Document sent email + download (Turkish)
      | locale |
      | tr     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_DOCUMENT_SENT_AR
    Examples: Document sent email + download (Arabic)
      | locale |
      | ar     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_DOCUMENT_SENT_NL
    Examples: Document sent email + download (Dutch)
      | locale |
      | nl     |

  Scenario Outline: Magic link email is in <locale> language
    Given I set this test to start with the following data:
      | flow      | ip | locale  |
      | Dashboard | ES | <locale>|
    And I am in Login page
    And I register a new user from login
    And I am redirected to Editor page
    And I wait for element upload document button
    And I am in Home page in locale <locale>
    And I wait for element login button
    And I click element login button
    And I request the magic link for the current user
    And I wait for the magic link email for the current user
    Then the magic link email is in the expected language

    @PDFEDITOR_TRANSACTIONAL_EMAIL_MAGIC_LINK_ES
    Examples: Magic link email in Spanish
      | locale |
      | es     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_MAGIC_LINK_FR
    Examples: Magic link email in French
      | locale |
      | fr     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_MAGIC_LINK_IT
    Examples: Magic link email in Italian
      | locale |
      | it     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_MAGIC_LINK_PT
    Examples: Magic link email in Portuguese
      | locale |
      | pt     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_MAGIC_LINK_DE
    Examples: Magic link email in German
      | locale |
      | de     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_MAGIC_LINK_JA
    Examples: Magic link email in Japanese
      | locale |
      | ja     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_MAGIC_LINK_PL
    Examples: Magic link email in Polish
      | locale |
      | pl     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_MAGIC_LINK_TR
    Examples: Magic link email in Turkish
      | locale |
      | tr     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_MAGIC_LINK_AR
    Examples: Magic link email in Arabic
      | locale |
      | ar     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_MAGIC_LINK_NL
    Examples: Magic link email in Dutch
      | locale |
      | nl     |

  Scenario Outline: Subscription cancellation email after user unsubscribes in <locale>
    Given I set this test to start with the following data:
      | flow    | ip | locale  |
      | Default | ES | <locale>|
    And I am in Home page in locale <locale>
    And I force URL with parameters
          """
          { "ip": "ES" }
          """
    When I wait 1 seconds
    Then I upload a PDF document
    And I am redirected to editor page
    And I click next button
    And I create a new user from the editor
    And I wait for element transaction price text
    And I wait 1 seconds
    And The text of element transaction price text should contain €1.95
    And The text of element transaction monthly price text should contain €49.95
    And I make the initial payment
    And I record the subscription purchase moment for unsubscribe email
    And I save my document
    And I am redirected to Dashboard page
    And I wait for element onboarding close modal button
    And I click element onboarding close modal button
    And I click element onboarding close modal button
    And I go to account
    And I am redirected to Account page
    And I wait for element membership link
    And I click element membership link
    And I wait for element cancel subscription link
    And I click element cancel subscription link
    And I wait for element yes unsubscribe button
    And I click yes unsubscribe button tracking subscription cancellation email
    And I wait for unsubscribe process to finish
    When I wait for the subscription cancellation email in Mailpit
    Then the subscription cancellation email contains expected localized content

    @PDFEDITOR_TRANSACTIONAL_EMAIL_SUBSCRIPTION_CANCELLATION_EN
    Examples: Subscription cancellation email in English
      | locale |
      | en     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_SUBSCRIPTION_CANCELLATION_ES
    Examples: Subscription cancellation email in Spanish
      | locale |
      | es     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_SUBSCRIPTION_CANCELLATION_FR
    Examples: Subscription cancellation email in French
      | locale |
      | fr     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_SUBSCRIPTION_CANCELLATION_IT
    Examples: Subscription cancellation email in Italian
      | locale |
      | it     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_SUBSCRIPTION_CANCELLATION_PT
    Examples: Subscription cancellation email in Portuguese
      | locale |
      | pt     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_SUBSCRIPTION_CANCELLATION_DE
    Examples: Subscription cancellation email in German
      | locale |
      | de     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_SUBSCRIPTION_CANCELLATION_JA
    Examples: Subscription cancellation email in Japanese
      | locale |
      | ja     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_SUBSCRIPTION_CANCELLATION_PL
    Examples: Subscription cancellation email in Polish
      | locale |
      | pl     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_SUBSCRIPTION_CANCELLATION_TR
    Examples: Subscription cancellation email in Turkish
      | locale |
      | tr     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_SUBSCRIPTION_CANCELLATION_AR
    Examples: Subscription cancellation email in Arabic
      | locale |
      | ar     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_SUBSCRIPTION_CANCELLATION_NL
    Examples: Subscription cancellation email in Dutch
      | locale |
      | nl     |

    @PDFEDITOR_TRANSACTIONAL_EMAIL_SUBSCRIPTION_CANCELLATION_KO
    Examples: Subscription cancellation email in Korean
      | locale |
      | ko     |
