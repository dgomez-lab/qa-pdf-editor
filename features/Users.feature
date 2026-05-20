Feature: Test PDF Editor for different user scenarios

  @PDFEDITOR_USER_REGISTER
  Scenario: User register
    Given I set this test to start with the following data:
      | flow    |
      | Default |
    And I am in Dashboard page
    And I am in CrmCustomersTable page
    When I search the current customer
    Then The text of element customers subscription status should be Registered

  @PDFEDITOR_USER_REGISTER_ACTIVE
  Scenario: User register and activate the user registered
    Given I set this test to start with the following data:
      | flow    |
      | Default |
    When I am in Account page
    Then I wait for element membership link
    And I click element membership link
    And I wait for element active status
    Then The page does have element active status

  @PDFEDITOR_USER_REGISTER_FORMS
  Scenario: User register going through forms path
    Given I set this test to start with the following data:
      | flow  |
      | Forms |
    And I am in Account page
    And I wait for element membership link
    When I click element membership link
    Then The page does have element active status

  Scenario Outline: User register with different UTMs
    Given I set this test to start with the following data:
      | flow   |
      | Direct |
    And I am in Login page
    When I force URL with parameters
          """
        {
          "utm_source":"<utm_source>",
          "utm_medium":"<utm_medium>",
          "utm_content":"<utm_content>",
          "utm_content":"<utm_content>",
          "utm_campaign":"<utm_campaign>"
        }
      """
    Then I wait for element email input
    And I register a new user
    And I am redirected to Editor page
    And I wait 6 seconds
    And I click next button
    And I am in CrmCustomer page
    And The text of element customer utm source should be <utm_source>
    And The text of element customer utm medium should be <utm_medium>

    @PDFEDITOR_USER_REGISTER_UTM_SOURCE_GOOGLE_MEDIUM_CPC
    Examples: Test register with UTM Source Google and UTM Medium cpc
      | utm_source | utm_medium | utm_content | utm_campaign |
      | google     | cpc        |             |              |

    @PDFEDITOR_USER_REGISTER_UTM_SOURCE_BING_MEDIUM_CPC_CONTENT_DISPLAY
    Examples: Test register with UTM Source Bing, Medium cpc and Content Display
      | utm_source | utm_medium | utm_content | utm_campaign |
      | bing       | cpc        | display     |              |

    @PDFEDITOR_USER_REGISTER_UTM_SOURCE_BING_MEDIUM_EMAIL_CAMPAIGN_1
    Examples: Test register with UTM Source Bing, Medium email and Campaign 1
      | utm_source | utm_medium | utm_content | utm_campaign |
      | bing       | email      |             | 1            |


  Scenario Outline: User clicks on every link on the account menu
    Given I set this test to start with the following data:
      | flow   |
      | Direct |
    When I am in Login page
    Then I login with an existing user
    And I am redirected to Dashboard page
    And I wait for element onboarding close modal button
    And I click element onboarding close modal button
    And I wait for element account menu
    And I click element account menu
    And I click element <element>
    And I am redirected to <redirect page> page
    And I wait for element <new element>
    And The page does have element <new element>

    @PDFEDITOR_USER_ACCOUNT
    Examples: Click on account link
      | element           | redirect page | new element      |
      | account menu link | account       | first name input |

    @PDFEDITOR_USER_MEMBERSHIP
    Examples: Click on membership link
      | element              | redirect page | new element   |
      | membership menu link | account       | active status |

    @PDFEDITOR_USER_DASHBOARD
    Examples: Click on dashboard link
      | element             | redirect page | new element            |
      | dashboard menu link | dashboard     | upload document button |

    @PDFEDITOR_USER_LOGOUT
    Examples: Click on logout link
      | element          | redirect page | new element      |
      | logout menu link | login         | login cta button |

  @PDFEDITOR_USER_EDITOR_CLOSE_MODAL_REDIRECT
  Scenario: Closing upload modal in editor redirects to dashboard
    Given I set this test to start with the following data:
      | flow                       | skipUploadInEditorLoadPage |
      | Dashboard                  | true                       |
    When I am in Dashboard page
    And I wait for element onboarding close modal button
    And The page does have element onboarding close modal button

  @PDFEDITOR_USER_UPLOAD_MODAL_CLOSE_HOME_NO_REDIRECT_EDITOR_REDIRECTS_DASHBOARD
  Scenario: Upload modal on Home does not redirect on close; editor upload modal redirects to dashboard
    Given I set this test to start with the following data:
      | flow   |
      | Direct |
    When I am in Home page
    And I click element try now button
    And I wait for element upload button
    Then The page does have element upload button
    When I click element cta close modal
    And I click element login button
    And I am redirected to Login page
    And I register a new user
    And I am redirected to Editor page
    And I wait for element close modal button
    And I wait 6 seconds
    And I click element close modal button
    And I am redirected to Dashboard page
    Then The page does have element upload document button

  @PDFEDITOR_USER_ACCOUNT_EDIT_NAME
  Scenario: User edit first name, last name and second last name in account
    Given I set this test to start with the following data:
      | flow    |
      | Default |
    When I am in Account page
    And I wait for element first name input
    And I fill element first name input with TestName
    And I fill element last name input with TestLastName
    And I fill element second last name input with TestSecondLast
    And I click element cta save changes
    And I wait 3 seconds
    And I click browser refresh button
    And I wait 3 seconds
    And The value of element first name input should be TestName
    And The value of element last name input should be TestLastName
    And The value of element second last name input should be TestSecondLast

  @PDFEDITOR_USER_CONTACT
  Scenario: User contact form
    Given I am in Contact page
    When I fill contact form
    Then The page does have element success text

  @PDFEDITOR_USER_AGENT_BLOCK_USER
  Scenario: Agent wants to ban an user from using his account
    Given I am in Dashboard page
    And I am in CrmCustomer page
    When I get the account ID from the customer
    Then I block the user created
    And I am in Home page
    And I click element login button
    And I am redirected to Login page
    And I try login with a blocked user
    And The text of element blocked user message validation should be You have entered an invalid username

  @PDFEDITOR_USER_PAID_NO_LOGOUT_OTHER_FILE
  Scenario: A paid user uploads a file and then logs in
    Given I am in Editor page
    When I wait for element download button
    And I wait 6 seconds
    And I click element download button
    And I login with an existing user
    And I wait for element download button
    And The page does have element download button

  @PDFEDITOR_USER_NO_PAID_NO_LOGOUT_OTHER_FILE
  Scenario: A non paid user uploads a file and then logs in
    Given I am in Editor page
    When I click next button
    Then I create a new user from the editor
    And I wait for element transaction price text
    And I force a wrong URL
    And I am redirected to Dashboard page
    And I wait 2 seconds
    And I wait for element onboarding close modal button
    And I click element onboarding close modal button
    And I click element upload document button
    And I upload a PDF document
    And I am redirected to Editor page
    And I click next button
    And I wait for element pay with card button
    And The page does have element pay with card button

  @PDFEDITOR_USER_TRUSTPILOT_NOT_HAPPY_REDIRECT
  Scenario: Trustpilot modal redirects to reviews when clicking not happy
    Given I am in Editor page
    When I wait for element download button
    And I click next button
    Then I create a new user from the editor
    And I make the initial payment
    And I wait for element payment success download button
    And I wait 2 seconds
    And I click element payment success download button
    And I am redirected to Dashboard page
    And I wait for element review not happy button
    And I click element review not happy button
    And I wait 2 seconds
    Then The url of current page should contain /reviews

  @PDFEDITOR_USER_TRUSTPILOT_HAPPY_NEW_TAB
  Scenario: Trustpilot modal opens evaluate link in a new tab when clicking happy
    Given I am in Editor page
    When I wait for element download button
    And I click next button
    Then I create a new user from the editor
    And I make the initial payment
    And I wait for element payment success download button
    And I wait 2 seconds
    And I click element payment success download button
    And I am redirected to Dashboard page
    And I wait for element review happy button
    And I click element review happy button
    And I go into new opened window
    Then The url of current page should contain trustpilot.com/evaluate-link
    And I return to main window

  Scenario Outline: User uploads different format files
    Given I set this test to start with the following data:
      | flow    |
      | Default |
    When I am in product landing page <landingAlt>
    And I wait for element upload button
    And I upload a <format> document
    And I am redirected to Editor page
    And I click next button
    And I create a new user from the editor
    And I make the initial payment
    And I wait for element payment success download button
    And The page does have element payment success download button
    And I wait 2 seconds
    And I click element payment success download button
    And I am redirected to Dashboard page
    And I wait for element upload document button
    And I close the onboarding
    And I wait for element pdf section
    And I wait 4 seconds
    And The dashboard pdf preview should not show load failure

    @PDFEDITOR_USER_UPLOADS_WORD_FILE
    Examples: Test uploading a file with word format
      | landingAlt | format |
      | wordToPDF  | DOCX   |

    @PDFEDITOR_USER_UPLOADS_EXCEL_FILE
    Examples: Test uploading a file with Excel format
      | landingAlt | format |
      | excelToPDF | XLSX   |

    @PDFEDITOR_USER_UPLOADS_POWER_POINT_FILE
    Examples: Test uploading a file with Power Point format
      | landingAlt | format |
      | pwpToPDF   | PPTX   |

    @PDFEDITOR_USER_UPLOADS_JPG_FILE
    Examples: Test uploading a file with JPG format
      | landingAlt | format |
      | jpgToPDF   | JPG    |

    @PDFEDITOR_USER_UPLOADS_JPEG_FILE
    Examples: Test uploading a file with JPEG format
      | landingAlt | format |
      | jpgToPDF   | JPEG   |

    @PDFEDITOR_USER_UPLOADS_PNG_FILE
    Examples: Test uploading a file with PNG format
      | landingAlt | format |
      | pngToPDF   | PNG    |