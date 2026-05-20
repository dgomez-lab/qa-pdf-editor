Feature: Test PDF Editor for different dashboard scenarios

  @PDFEDITOR_DASHBOARD
    Scenario: Dashboard for new paid users
      Given I set this test to start with the following data:
        | flow    |
        | Default |
      When I am in Dashboard page
      Then The page does have element upload document button

  @PDFEDITOR_DASHBOARD_PAYMENT
    Scenario: Register and payment through Dashboard
      Given I set this test to start with the following data:
        | flow      |
        | Dashboard |
      And I am in Dashboard page
      When I wait for element open form 0 button
      Then The page does not have element get full access dashboard button

  @PDFEDITOR_DASHBOARD_SUBSCRIBE_UPLOAD_AND_PAY
  Scenario: New user reaches Dashboard via editor modal close, then subscribes from Dashboard, uploads and pays
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

  @PDFEDITOR_DASHBOARD_PERMANENT_DELETE_DOCUMENT
    Scenario: Upload, delete, restore and delete definitely a document in the dashboard
      Given I set this test to start with the following data:
        | flow    |
        | Default |
      And I am in Dashboard page
      And I close the onboarding
      And I click element upload document button
      And I upload a PDF document
      And I am redirected to editor page
      And I wait for element logo
      And I click next button
      And I wait for element payment success download button
      And I click element payment success download button
      And I am redirected to Dashboard page
      And I wait for element upload document button
      And I wait 4 seconds
      And I click browser refresh button
      When I delete, restore back and delete definitely an element
      Then The page does not have element delete element 0 bin button

  @PDFEDITOR_DASHBOARD_EDIT_FORM
    Scenario: Open an existing form from Most used forms in the dashboard
      Given I set this test to start with the following data:
        | flow    |
        | Default |
      And I am in Dashboard page
      And I wait 4 seconds
      And I wait for element open document side button
      And I close the onboarding
      And I click element open form 0 button
      And I am redirected to editor page
      And I click next button
      And I wait for element payment success download button
      And I click element payment success download button
      And I am redirected to Dashboard page
      And I wait for element upload document button
      And I wait 4 seconds
      And I click browser refresh button
      When I wait for element my document 1 radio button
      Then I click element my document 1 radio button

  @PDFEDITOR_DASHBOARD_RENAME_DOCUMENT
  Scenario: Renaming the first document from the dashboard
    Given I set this test to start with the following data:
      | flow    |
      | Default |
    And I am in Dashboard page
    And I close the onboarding
    When I rename the first document
    Then The text of element document 0 name should contain QA Rename.pdf

