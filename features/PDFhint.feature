# Smoke E2E for staging.pdfhint.com (pdfhintSmoke suite).
# Same steps as equivalent payment/Dashboard/SEO scenarios; @PDFHINT forces https://staging.pdfhint.com.

@PDFHINT
Feature: PDF Hint — staging smoke tests

  @PDFEDITOR_PDFHINT_SMOKE_VISA
  Scenario Outline: Initial payment with Visa (pdfhint smoke)
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
    Then the customer domain should be pdfhint.com
    And I check the last first transaction payment data:
      | transactionType | transactionStatus | paymentSolution | cardType   | amount | currency | subscriptionName |
      | Payment         | Success           | Stripe          | credit     | 1.95   | EUR      | Full Access      |

    Examples:
      | card |
      | Visa |

  @PDFEDITOR_PDFHINT_SMOKE_REFUND
  Scenario Outline: Refund of an initial payment with Visa (pdfhint smoke)
    Given I set this test to start with the following data:
      | flow    | card   |
      | Default | <card> |
    And I am in Editor page
    And I click next button
    And I create a new user from the editor
    And I make the initial payment
    And I wait for element pdf radio button
    And The page does have element pdf radio button
    And I am in CrmCustomer page
    Then the customer domain should be pdfhint.com
    And I refund the last payment
    When I click browser refresh button
    Then I check the last refund payment data:
      | transactionType | transactionStatus | paymentSolution | amount | currency | subscriptionName |
      | Refund          | Success           | Stripe          | 1.95   | EUR      | Full Access      |

    Examples:
      | card |
      | Visa |

  @PDFEDITOR_PDFHINT_SMOKE_DASHBOARD
  Scenario: New user reaches Dashboard via editor modal close, then subscribes from Dashboard, uploads and pays (pdfhint smoke)
    Given I set this test to start with the following data:
      | flow                       | skipUploadInEditorLoadPage |
      | Dashboard                  | true                       |
    When I am in Dashboard page
    And I close the onboarding once
    And I wait for element get full access button
    And I click element get full access button
    And I wait for element upload document button
    And I upload a PDF document
    And I am redirected to editor page
    And I wait until hide element upload loader
    And I click next button
    And I make the initial payment
    And I wait for element pdf radio button
    Then The page does have element pdf radio button

  @PDFEDITOR_PDFHINT_SMOKE_SEO
  Scenario: Header links on Home use absolute http(s) URLs (pdfhint smoke)
    Given I set this test to start with the following data:
      | flow   |
      | Direct |
    When I am in Home page
    Then every link in the Home page header should have an absolute http or https URL
