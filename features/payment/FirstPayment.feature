Feature: Test PDF Editor for different first payment scenarios

  Scenario Outline: Initial payment with different cards
    Given I set this test to start with the following data:
      | flow    | card   |
      | Default | <card> |
    And I am in Editor page
    And I click next button
    And I create a new user from the editor
    And I make the initial payment
    And I wait for element pdf radio button
    Then The page does have element pdf radio button
    And I am in CrmCustomer page
    And I check the last first transaction payment data:
      | transactionType | transactionStatus | paymentSolution | cardType   | amount | currency | subscriptionName |
      | Payment         | Success           | Stripe          | credit     | 1.95   | EUR      | Full Access      |

    @PDFEDITOR_PAYMENT_FIRST_VISA
    Examples: Test payment for a Visa card
      | card |
      | Visa |

    @PDFEDITOR_PAYMENT_FIRST_MASTERCARD
    Examples: Test payment for a Mastercard card
      | card       |
      | MasterCard |

    @PDFEDITOR_PAYMENT_FIRST_AMEX
    Examples: Test payment for a Amex card
      | card |
      | AMEX |

    @PDFEDITOR_PAYMENT_FIRST_DISCOVER
    Examples: Test payment for a Discover card
      | card     |
      | Discover |

    @PDFEDITOR_PAYMENT_FIRST_DINNERS
    Examples: Test payment for a Dinners card
      | card    |
      | Dinners |

    @PDFEDITOR_PAYMENT_FIRST_JCB
    Examples: Test payment for a JCB card
      | card |
      | JCB  |

  Scenario Outline: Refund of an initial payment in <currency> with random success card
    Given I set this test to start with the following data:
      | flow    | ip   |
      | Default | <ip> |
    And I set a random success payment card
    And I am in Home page
    And I force URL with parameters
          """
        {
          "ip":"<ip>"
        }
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
    And I wait for element pdf radio button
    And The page does have element pdf radio button
    And I am in CrmCustomer page
    And I refund the last payment
    When I click browser refresh button
    Then I check the last refund payment data:
      | transactionType | transactionStatus | paymentSolution | amount   | currency   | subscriptionName |
      | Refund          | Success           | Stripe          | <amount> | <currency> | Full Access      |

    @PDFEDITOR_PAYMENT_FIRST_REFUND_USD
    Examples: Test refund for initial payment in USD (US)
      | ip | currency | element                | monthly element                | monthly price editor | price  | amount |
      | US | USD      | transaction price text | transaction monthly price text | $49.95               | $1.95  | 1.95   |

    @PDFEDITOR_PAYMENT_FIRST_REFUND_EUR
    Examples: Test refund for initial payment in EUR (ES)
      | ip | currency | element                | monthly element                | monthly price editor | price  | amount |
      | ES | EUR      | transaction price text | transaction monthly price text | €49.95               | €1.95  | 1.95   |

    @PDFEDITOR_PAYMENT_FIRST_REFUND_CAD
    Examples: Test refund for initial payment in CAD (CA)
      | ip | currency | element                | monthly element                | monthly price editor | price  | amount |
      | CA | CAD      | transaction price text | transaction monthly price text | $49.95               | $2.95  | 2.95   |

    @PDFEDITOR_PAYMENT_FIRST_REFUND_AUD
    Examples: Test refund for initial payment in AUD (AU)
      | ip | currency | element                | monthly element                | monthly price editor | price  | amount |
      | AU | AUD      | transaction price text | transaction monthly price text | $49.95               | $2.95  | 2.95   |

    @PDFEDITOR_PAYMENT_FIRST_REFUND_GBP
    Examples: Test refund for initial payment in GBP (GB)
      | ip | currency | element                | monthly element                | monthly price editor | price  | amount |
      | GB | GBP      | transaction price text | transaction monthly price text | £49.95               | £1.95  | 1.95   |

    @PDFEDITOR_PAYMENT_FIRST_REFUND_JPY
    Examples: Test refund for initial payment in JPY (JP)
      | ip | currency | element                | monthly element                | monthly price editor | price  | amount |
      | JP | JPY      | transaction price text | transaction monthly price text | ¥7500.00             | ¥300   | 300    |

    @PDFEDITOR_PAYMENT_FIRST_REFUND_BRL
    Examples: Test refund for initial payment in BRL (BR)
      | ip | currency | element                | monthly element                | monthly price editor | price   | amount |
      | BR | BRL      | transaction price text | transaction monthly price text | R$229,00             | R$9,90  | 9.9    |

    @PDFEDITOR_PAYMENT_FIRST_REFUND_TRY
    Examples: Test refund for initial payment in TRY (TR)
      | ip | currency | element                | monthly element                | monthly price editor | price    | amount |
      | TR | TRY      | transaction price text | transaction monthly price text | ₺999,00              | ₺59,00   | 59     |

    @PDFEDITOR_PAYMENT_FIRST_REFUND_PLN
    Examples: Test refund for initial payment in PLN (PL)
      | ip | currency | element                | monthly element                | monthly price editor | price    | amount |
      | PL | PLN      | transaction price text | transaction monthly price text | 149,00 zł            | 7,90 zł  | 7.9    |

    @PDFEDITOR_PAYMENT_FIRST_REFUND_DEFAULT
    Examples: Test refund for initial payment with default IP (EUR)
      | ip      | currency | element                | monthly element                | monthly price editor | price  | amount |
      | Default | EUR      | transaction price text | transaction monthly price text | €49.95               | €1.95  | 1.95   |

 # @PDFEDITOR_PAYMENT_FIRST_REFUND_FAILED
 # Scenario: Refund failed of an initial payment
 #   Given I set this test to start with the following data:
 #     | flow    |
 #     | Default |
 #   And I am in Thankyou page
 #   And I am in CrmCustomer page
 #   When I refund the last payment
 #   And I click browser refresh button
 #   Then I check the last refund payment data:
 #     | transactionType | transactionStatus | paymentSolution | cardType | amount | currency | subscriptionName |
 #     | Refund          | Pending           | Stripe          | credit   | 1.95   | EUR      | Full Access      |
 #   And I get the order ID from the last payment
 #   And I confirm the refund of the last payment with status failed
 #   And I click browser refresh button
 #   And I check the last refund payment data:
 #     | transactionType | transactionStatus | paymentSolution | cardType | amount | currency | subscriptionName |
 #     | Refund          | Failed            | Stripe          | credit   | 1.95   | EUR      | Full Access      |

  Scenario Outline: Wrong initial payments with different cards
    Given I set this test to start with the following data:
      | flow    | card   |
      | Default | <card> |
    And I am in Editor page
    And I click next button
    And I create a new user from the editor
    And I make the initial payment
    Then I wait for element close modal button
    And I click element close modal button
    And I am in CrmCustomer page
    And I check the last first transaction payment data:
      | transactionType | transactionStatus | paymentSolution | cardType | amount | currency | subscriptionName |
      | Payment         | Failed            | Stripe          | credit   | 1.95   | EUR      | Full Access      |
    And I click browser refresh button
    And The text of element customer subscription status should be Registered

    @PDFEDITOR_PAYMENT_FIRST_WRONG_CARD_NUMBER_NOT_RECOGNIZED
    Examples: Test payment for a wrong payment with not recognized response
      | card    |
      | Generic |

    @PDFEDITOR_PAYMENT_FIRST_WRONG_CARD_NUMBER_HIGH_RISK
    Examples: Test payment for a wrong payment with high risk response
      | card    |
      | NoFunds |

    @PDFEDITOR_PAYMENT_FIRST_WRONG_CARD_NUMBER_MULTIPLE_DISPUTES
    Examples: Test payment for a wrong payment with multiple disputes response
      | card     |
      | CardLost |

  Scenario Outline: Initial payment with different UTMs
    Given I set this test to start with the following data:
      | flow    |
      | Default |
    When I am in Editor page
    Then I wait for element download button
    And I force URL with parameters
          """
        {
          "utm_source":"<utm_source>",
          "utm_medium":"<utm_medium>",
          "utm_content":"<utm_content>",
          "utm_campaign":"<utm_campaign>"
        }
      """
    And I click next button
    And I create a new user from the editor
    And I make the initial payment
    And I wait for element pdf radio button
    Then The page does have element pdf radio button
    And I am in CrmCustomer page
    And I check the last first transaction payment data:
      | transactionType | transactionStatus | paymentSolution | cardType | amount | currency | subscriptionName |
      | Payment         | Success           | Stripe          | credit   | 1.95   | EUR      | Full Access      |

    @PDFEDITOR_PAYMENT_UTM_SOURCE_GOOGLE_MEDIUM_CPC
    Examples: Test payment with UTM Source Google and UTM Medium cpc
      | utm_source | utm_medium | utm_content | utm_campaign |
      | google     | cpc        |             |              |

    @PDFEDITOR_PAYMENT_UTM_SOURCE_BING_MEDIUM_CPC
    Examples: Test payment with UTM Source Bing and UTM Medium cpc
      | utm_source | utm_medium | utm_content | utm_campaign |
      | bing       | cpc        |             |              |

    @PDFEDITOR_PAYMENT_UTM_SOURCE_GOOGLE_MEDIUM_CPC_CONTENT_DISPLAY
    Examples: Test payment with UTM Source Google, Medium cpc and Content Display
      | utm_source | utm_medium | utm_content | utm_campaign |
      | google     | cpc        | display     |              |

    @PDFEDITOR_PAYMENT_UTM_SOURCE_BING_MEDIUM_CPC_CONTENT_DISPLAY
    Examples: Test payment with UTM Source Bing, Medium cpc and Content Display
      | utm_source | utm_medium | utm_content | utm_campaign |
      | bing       | cpc        | display     |              |

    @PDFEDITOR_PAYMENT_UTM_SOURCE_GOOGLE_MEDIUM_EMAIL_CAMPAIGN_1
    Examples: Test payment with UTM Source Google, Medium email and Campaign 1
      | utm_source | utm_medium | utm_content | utm_campaign |
      | google     | email      |             | 1            |

    @PDFEDITOR_PAYMENT_UTM_SOURCE_GOOGLE_MEDIUM_EMAIL_CAMPAIGN_2
    Examples: Test payment with UTM Source Google, Medium email and Campaign 2
      | utm_source | utm_medium | utm_content | utm_campaign |
      | google     | email      |             | 2            |

    @PDFEDITOR_PAYMENT_UTM_SOURCE_BING_MEDIUM_EMAIL_CAMPAIGN_1
    Examples: Test payment with UTM Source Bing, Medium email and Campaign 1
      | utm_source | utm_medium | utm_content | utm_campaign |
      | bing       | email      |             | 1            |

    @PDFEDITOR_PAYMENT_UTM_SOURCE_BING_MEDIUM_EMAIL_CAMPAIGN_2
    Examples: Test payment with UTM Source Bing, Medium email and Campaign 1
      | utm_source | utm_medium | utm_content | utm_campaign |
      | bing       | email      |             | 2            |

    @PDFEDITOR_PAYMENT_UTM_SOURCE_MEDIUM_EMAIL_CAMPAIGN_3
    Examples: Test payment with UTM Source Empty, Medium email and Campaign 3
      | utm_source | utm_medium | utm_content | utm_campaign |
      | bing       | email      |             | 3            |

  @PDFEDITOR_PAYMENT_CANCEL_SUBSCRIPTION_BY_USER
  Scenario: User pays, cancels and confirms the cancellation of a subscription
    Given I set this test to start with the following data:
      | flow    |
      | Default |
    And I am in Account page
    And I wait for element membership link
    And I click element membership link
    And I cancel subscription
    And I click browser refresh button
    And I wait for element transaction price text
    And The text of element transaction price text should contain You have canceled your subscription
    And I am in CrmCustomer page
    And I get the subscription ID from the customer
    And The text of element customer subscription status should be Non renewal
    And I confirm the subscription cancellation
    And I am in Editor page
    And I click next button
    And I login with the last user created
    When I wait for element transaction price text
    Then The page does have element transaction price text

  @PDFEDITOR_PAYMENT_CANCEL_SUBSCRIPTION_BY_AGENT
  Scenario: User pays, then, an agent cancels and confirms the cancellation of the subscription
    Given I set this test to start with the following data:
      | flow    |
      | Default |
    And I am in Dashboard page
    And I am in CrmCustomer page
    When I get the subscription ID from the customer
    Then I unsubscribe the customer
    And The text of element customer subscription status should be Non renewal
    And I confirm the subscription cancellation
    And I click browser refresh button
    And I wait for element customer subscription status
    And The text of element customer subscription status should be Unsuscribed

  Scenario Outline: Initial payment with different IPs
    Given I set this test to start with the following data:
      | flow    | ip   |
      | Default | <ip> |
    And I am in Home page
    And I force URL with parameters
          """
        {
          "ip":"<ip>"
        }
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
    And I go to account
    And I am redirected to Account page
    And I wait for element membership link
    And I click element membership link
    And I wait for element <element>
    And I wait 1 seconds
    And The text of element <element> should contain <monthly price>
    And I am in CrmCustomer page
    And I check the last first transaction payment data:
      | transactionType | transactionStatus | paymentSolution | cardType | amount   | currency   | subscriptionName |
      | Payment         | Success           | Stripe          | credit   | <amount> | <currency> | Full Access      |

    @PDFEDITOR_PAYMENT_IP_US
    Examples: Test payment with IP of US country
      | ip | element                | monthly element                | monthly price editor | price | monthly price | amount | currency |
      | US | transaction price text | transaction monthly price text | $49.95               | $1.95 | $ 49.95 USD    | 1.95   | USD      |

    @PDFEDITOR_PAYMENT_IP_AU
    Examples: Test payment with IP of AU country
      | ip | element                | monthly element                | monthly price editor | price | monthly price | amount | currency |
      | AU | transaction price text | transaction monthly price text | $49.95               | $2.95 | $ 49.95 AUD    | 2.95   | AUD      |

    @PDFEDITOR_PAYMENT_IP_CA
    Examples: Test payment with IP of CA country
      | ip | element                | monthly element                | monthly price editor | price | monthly price | amount | currency |
      | CA | transaction price text | transaction monthly price text | $49.95               | $2.95 | $ 49.95 CAD    | 2.95   | CAD      |

    @PDFEDITOR_PAYMENT_IP_ES
    Examples: Test payment with IP of ES country
      | ip | element                | monthly element                | monthly price editor | price | monthly price | amount | currency |
      | ES | transaction price text | transaction monthly price text | €49.95               | €1.95 | € 49.95 EUR    | 1.95   | EUR      |

    @PDFEDITOR_PAYMENT_IP_GB
    Examples: Test payment with IP of GB country
      | ip | element                | monthly element                | monthly price editor | price  | monthly price | amount | currency |
      | GB | transaction price text | transaction monthly price text | £49.95               | £1.95  | £ 49.95 GBP    | 1.95   | GBP      |

  Scenario Outline: User register with other UTMs
    Given I set this test to start with the following data:
      | flow   |
      | Direct |
    When I am in Editor page
    Then I wait for element download button
    And I force URL with parameters
          """
        {
          "utm_adgroup":"<utm_adgroup>",
          "utm_network":"<utm_network>",
          "utm_device":"<utm_device>",
          "utm_devicemodel":"<utm_devicemodel>",
          "utm_matchtype":"<utm_matchtype>",
          "utm_loc_physical_ms":"<utm_loc_physical_ms>",
          "utm_campaigntype":"<utm_campaigntype>"
        }
      """
    And I wait for element download button
    And I wait 4 seconds
    And I click element download button
    And I create a new user from the editor
    And I make the initial payment
    And I wait for element payment success download button
    And The page does have element payment success download button

    @PDFEDITOR_PAYMENT_UTM_REGISTER_ALL
    Examples: Test payment with UTM Source Google and UTM Medium cpc
      | utm_adgroup | utm_network | utm_device | utm_devicemodel | utm_matchtype | utm_loc_physical_ms | utm_campaigntype |
      | adgroup     | network     | device     | devicemodel     | matchtype     | locphysicalms       | campaigntype     |

    @PDFEDITOR_PAYMENT_UTM_REGISTER_ADGROUP
    Examples: Test payment with UTM Source Google and UTM Medium cpc
      | utm_adgroup | utm_network | utm_device | utm_devicemodel | utm_matchtype | utm_loc_physical_ms | utm_campaigntype |
      | adgroup     |             |            |                 |               |                     |                  |

    @PDFEDITOR_PAYMENT_UTM_REGISTER_NETWORK
    Examples: Test payment with UTM Source Google and UTM Medium cpc
      | utm_adgroup | utm_network | utm_device | utm_devicemodel | utm_matchtype | utm_loc_physical_ms | utm_campaigntype |
      |             | network     |            |                 |               |                     |                  |

    @PDFEDITOR_PAYMENT_UTM_REGISTER_DEVICE
    Examples: Test payment with UTM Source Google and UTM Medium cpc
      | utm_adgroup | utm_network | utm_device | utm_devicemodel | utm_matchtype | utm_loc_physical_ms | utm_campaigntype |
      |             |             | device     |                 |               |                     |                  |

    @PDFEDITOR_PAYMENT_UTM_REGISTER_DEVICEMODEL
    Examples: Test payment with UTM Source Google and UTM Medium cpc
      | utm_adgroup | utm_network | utm_device | utm_devicemodel | utm_matchtype | utm_loc_physical_ms | utm_campaigntype |
      |             |             |            | devicemodel     |               |                     |                  |

    @PDFEDITOR_PAYMENT_UTM_REGISTER_MATCHTYPE
    Examples: Test payment with UTM Source Google and UTM Medium cpc
      | utm_adgroup | utm_network | utm_device | utm_devicemodel | utm_matchtype | utm_loc_physical_ms | utm_campaigntype |
      |             |             |            |                 | matchtype     |                     |                  |

    @PDFEDITOR_PAYMENT_UTM_REGISTER_LOCPHYSICALMS
    Examples: Test payment with UTM Source Google and UTM Medium cpc
      | utm_adgroup | utm_network | utm_device | utm_devicemodel | utm_matchtype | utm_loc_physical_ms | utm_campaigntype |
      |             |             |            |                 |               | locphysicalms       |                  |

    @PDFEDITOR_PAYMENT_UTM_REGISTER_CAMPAIGNTYPE
    Examples: Test payment with UTM Source Google and UTM Medium cpc
      | utm_adgroup | utm_network | utm_device | utm_devicemodel | utm_matchtype | utm_loc_physical_ms | utm_campaigntype |
      |             |             |            |                 |               |                     | campaigntype     |