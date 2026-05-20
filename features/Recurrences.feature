Feature: Test PDF Editor recurrences for legacy accounts

  @PDFEDITOR_PAYMENT_RECURRENCE_LEGACY_14056
  Scenario: Legacy recurrence 14056 is processed and visible in CRM
    Given I set this test to start with the following data:
      | flow   | email                                                 |
      | Direct | dario.ochoa+legacy_customer+f3a551c0@ext.leadtech.com |
    And I am in CrmCustomer page
    And I get the subscription ID from the customer
    When I pay the 14056 recurrency with status success
    And I wait for recurrency process to finish
    Then I check the last recurrency payment data:
      | transactionType | transactionStatus | paymentSolution | cardType | amount | currency | subscriptionName |
      | Payment         | Success           | Worldpay        | VISA     | 29.95  | USD      | Full Access      |
    And all date fields of the last transaction should be today

  @PDFEDITOR_PAYMENT_RECURRENCE_LEGACY_14056_SOFT_DECLINE
  Scenario: Legacy recurrence 14056 soft decline should be failed
    Given I set this test to start with the following data:
      | flow   | email                                                 |
      | Direct | dario.ochoa+legacy_customer+f3a551c0@ext.leadtech.com |
    And I am in CrmCustomer page
    And I get the subscription ID from the customer
    When I pay the 14056 recurrency with status soft
    And I wait for recurrency process to finish
    Then I check the last recurrency payment data:
      | transactionType | transactionStatus | paymentSolution | cardType | amount | currency | subscriptionName |
      | Payment         | Failed            | Padrina         | VISA     | 29.95  | USD      | Full Access      |
    And all date fields of the last transaction should be today
