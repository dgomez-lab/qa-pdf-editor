# Remember to activate headless mode in order to run these scenarios locally!
Feature: VISUAL - Visual regression test for multiple pages within the PDF Editor site

  Scenario Outline: Visual comparison of base pages
    Given I set this test to start with the following data:
      | flow   |
      | Direct |
    When I am in <page> page
    Then I wait 10 seconds
    And I take a screenshot of the current page
    And the comparison of <page> page should be correct

    @PDFEDITOR_VISUAL_HOME
    Examples: Home
      | page |
      | Home |

    @PDFEDITOR_VISUAL_LOGIN
    Examples: Login
      | page  |
      | Login |

  Scenario Outline: Visual comparison of editor page
    Given I set this test to start with the following data:
      | flow   |
      | Direct |
    When I am in <page> page
    Then I wait 6 seconds
    And I wait for element download button
    And I wait until hide element loading overlay
    And I take a screenshot of the current page
    And the comparison of <page> page should be correct

    @PDFEDITOR_VISUAL_EDITOR
    Examples: Editor
      | page   |
      | Editor |

  @PDFEDITOR_VISUAL_ACCOUNT
  Scenario: Visual comparison for Account page
    Given I set this test to start with the following data:
      | flow    |
      | Default |
    And I am in Account page
    When I take a screenshot of the current page
    Then the comparison of Account page should be correct

  @PDFEDITOR_VISUAL_ACCOUNT_CANCELED
  Scenario: Visual comparison for Account Canceled page
    Given I set this test to start with the following data:
      | flow    |
      | Default |
    And I am in Account page
    And I click element membership link
    And I wait for element cancel subscription link
    And I click element cancel subscription link
    And I wait for element yes unsubscribe button
    And I click element yes unsubscribe button
    And I wait for unsubscribe process to finish
    When I take a screenshot of the current page
    Then the comparison of Account Canceled page should be correct

  @PDFEDITOR_VISUAL_FORMS
  Scenario: Visual comparison of other Forms page
    Given I am in Home page
    When I wait and click element forms header link
    Then I take a screenshot of the current page
    And the comparison of Forms page should be correct

  @PDFEDITOR_VISUAL_UPLOAD_MODAL
  Scenario: Visual comparison of home upload modal
    Given I am in Home page
    When I click element try now button
    Then I take a screenshot of the current page
    And the comparison of Upload Modal page should be correct

  @PDFEDITOR_VISUAL_EDITOR_MODAL_NO_PAID
  Scenario: Visual comparison of editor modal of a non paid user
    Given I am in Editor page
    When I wait for element download button
    Then I wait 6 seconds
    And I wait until hide element loading overlay
    And I click element download button
    And I take a screenshot of the current page
    And the comparison of Editor Modal No Paid page should be correct

  @PDFEDITOR_VISUAL_EDITOR_MODAL_PAID
  Scenario: Visual comparison of editor modal of a paid user
   Given I set this test to start with the following data:
     | flow   |
     | Direct |
    When I am in Login page
    Then I login with an existing user
    And I am redirected to Dashboard page
    And I wait for element onboarding close modal button
    And I click element onboarding close modal button
    And I wait for element open document 0 button
    And I click element open document 0 button
    And I am redirected to Editor page
    And I wait for element download button
    And I wait until hide element loading overlay
    And I click element download button
    And I return to main iframe
    And I wait for element payment success download button
    And I wait 2 seconds
    And I take a screenshot of the current page
    And the comparison of Editor Modal Paid page should be correct

  @PDFEDITOR_VISUAL_EDITOR_MODAL_CONVERT_PAID
  Scenario: Visual comparison of editor convert modal for a paid user
   Given I set this test to start with the following data:
     | flow   |
     | Direct |
   When I am in Login page
   Then I login with an existing user
   And I am redirected to Dashboard page
   And I wait for element onboarding close modal button
   And I click element onboarding close modal button
   And I wait for element open document 0 button
   And I click element open document 0 button
   And I am redirected to Editor page
    And I wait for element download button
    And I wait until hide element loading overlay
    And I wait and click element convert button
    And I return to main iframe
    And I wait for element select format modal continue button
    And I take a screenshot of the current page
    And the comparison of Editor Modal Convert Paid page should be correct

  @PDFEDITOR_VISUAL_EDITOR_MODAL_SHARE_MAIL
  Scenario: Visual comparison of editor email share modal for a paid user
   Given I set this test to start with the following data:
     | flow   |
     | Direct |
   When I am in Login page
   Then I login with an existing user
   And I am redirected to Dashboard page
   And I wait for element onboarding close modal button
   And I click element onboarding close modal button
   And I wait for element open document 0 button
   And I click element open document 0 button
   And I am redirected to Editor page
    And I wait for element share toolbar button
    And I wait until hide element loading overlay
    And I wait and click element share toolbar button
    And I return to main iframe
    And I wait for element select format modal continue button
    And I click element select format modal continue button
   And I wait for element email share modal email input
   And I take a screenshot of the current page
   And the comparison of Editor Select Mail To Share Modal page should be correct

  @PDFEDITOR_VISUAL_EDITOR_MODAL_PAYMENT
  Scenario: Visual comparison of editor payment modal
    Given I am in Editor page
    When I click next button
    Then I create a new user from the editor
    And I wait for element transaction price text
    And I take a screenshot of the current page
    And the comparison of Editor Payment Modal page should be correct

  Scenario Outline: Visual comparison of other base pages
    Given I am in Home page
    When I wait and click element <element>
    #When I click element <element>
    Then I take a screenshot of the current page
    And the comparison of <page> page should be correct

    @PDFEDITOR_VISUAL_ABOUT_US
    Examples: About Us
      | page     | element              |
      | About Us | about us footer link |

    @PDFEDITOR_VISUAL_CONTACT
    Examples: Contact
      | page    | element             |
      | Contact | contact footer link |

    @PDFEDITOR_VISUAL_FAQS
    Examples: FAQs
      | page | element          |
      | FAQs | faqs footer link |

  Scenario Outline: Visual comparison of other base pages in a new tab
    Given I am in Home page
    When I wait and click element <element>
    Then I go into new opened window
    And I wait for element about us footer link
    And I take a screenshot of the current page
    And the comparison of <page> page should be correct

    @PDFEDITOR_VISUAL_DOWNLOADS
    Examples: Downloads
      | page      | element               |
      | Downloads | downloads footer link |

    @PDFEDITOR_VISUAL_TERMS_OF_USE
    Examples: Terms of Use
      | page         | element                  |
      | Terms of Use | terms of use footer link |

    @PDFEDITOR_VISUAL_PRIVACY_POLICY
    Examples: Privacy Policy
      | page           | element                    |
      | Privacy Policy | privacy policy footer link |

    @PDFEDITOR_VISUAL_TERMS_AND_CONDITIONS
    Examples: Terms and Conditions
      | page                 | element                          |
      | Terms and Conditions | terms and conditions footer link |

    @PDFEDITOR_VISUAL_COOKIES
    Examples: Cookies
      | page    | element             |
      | Cookies | cookies footer link |

  @PDFEDITOR_VISUAL_CANCEL_SUBSCRIPTION
  Scenario: Visual comparison of unsubscribe screen
    Given I set this test to start with the following data:
      | flow    |
      | Default |
    And I am in Account page
    When I wait for element membership link
    Then I click element membership link
    And I wait for element cancel subscription link
    And I click element cancel subscription link
    And I wait for element yes unsubscribe button
    And I take a screenshot of the current page
    And the comparison of Unsubscribe page should be correct

  Scenario Outline: Visual comparison of all forms in editor page
    Given I am in Home page
    When I wait and click element forms header link
    Then I wait for element <element>
    And I click element <element>
    And I wait for element get started button
    And I click element get started button
    And I am redirected to Editor page
    And I wait for element download button
    And I wait until hide element loading overlay
    And I take a screenshot of the current page
    And the comparison of <page> page should be correct

    @PDFEDITOR_VISUAL_FORM_W4
    Examples: Form W4
      | page    | element      |
      | Form W4 | form w4 link |

    @PDFEDITOR_VISUAL_FORM_W9
    Examples: Form W9
      | page    | element      |
      | Form W9 | form w9 link |

    @PDFEDITOR_VISUAL_FORM_1040_2021
    Examples: Form 1040 2021
      | page           | element             |
      | Form 1040 2021 | form 1040 2021 link |

    @PDFEDITOR_VISUAL_FORM_1040
    Examples: Form 1040
      | page      | element        |
      | Form 1040 | form 1040 link |

    @PDFEDITOR_VISUAL_FORM_SOCIAL
    Examples: Form Social
      | page        | element          |
      | Form Social | form social link |

    @PDFEDITOR_VISUAL_FORM_1099
    Examples: Form 1099
      | page      | element        |
      | Form 1099 | form 1099 link |

    @PDFEDITOR_VISUAL_FORM_1099_NEC
    Examples: Form 1099 Nec
      | page          | element            |
      | Form 1099 Nec | form 1099 nec link |

    @PDFEDITOR_VISUAL_FORM_W2
    Examples: Form W2
      | page    | element      |
      | Form W2 | form w2 link |

    @PDFEDITOR_VISUAL_FORM_1095
    Examples: Form 1095
      | page      | element        |
      | Form 1095 | form 1095 link |

    @PDFEDITOR_VISUAL_FORM_PHILIPPINES
    Examples: Form Philippines
      | page             | element               |
      | Form Philippines | form philippines link |

    @PDFEDITOR_VISUAL_FORM_941
    Examples: Form 941
      | page     | element       |
      | Form 941 | form 941 link |

    @PDFEDITOR_VISUAL_FORM_FEEDEX
    Examples: Form Feedex
      | page        | element          |
      | Form Feedex | form feedex link |

    @PDFEDITOR_VISUAL_FORM_DA
    Examples: Form Da
      | page    | element      |
      | Form Da | form da link |

    @PDFEDITOR_VISUAL_FORM_SCHEDULE
    Examples: Form Schedule
      | page          | element            |
      | Form Schedule | form schedule link |

    @PDFEDITOR_VISUAL_FORM_DS11
    Examples: Form Ds11
      | page      | element        |
      | Form Ds11 | form ds11 link |

    @PDFEDITOR_VISUAL_FORM_OBITUARY
    Examples: Form Obituary
      | page          | element            |
      | Form Obituary | form obituary link |

    @PDFEDITOR_VISUAL_FORM_MARRIAGE
    Examples: Form Marriage
      | page          | element            |
      | Form Marriage | form marriage link |

    @PDFEDITOR_VISUAL_FORM_GIFT
    Examples: Form Gift
      | page      | element        |
      | Form Gift | form gift link |

  @PDFEDITOR_VISUAL_404
  Scenario: Visual comparison of 404 page
    Given I am in Home page
    When I click element forms header link
    Then I wait for element form w4 link
    And I click element logo
    And I force a wrong URL
    When I take a screenshot of the current page
    Then the comparison of 404 page should be correct

  @PDFEDITOR_VISUAL_DASHBOARD_ONBOARDING
  Scenario: Visual comparison of the Dashboard onboarding for new users
    Given I set this test to start with the following data:
      | flow    |
      | Default |
    When I am in Dashboard page
    Then I wait for element onboarding close modal button
    And I click element onboarding close modal button
    And I wait for element onboarding view tutorial button
    And I take a screenshot of the current page
    And the comparison of Dashboard Onboarding page should be correct


  Scenario Outline: Visual comparison of the Dashboard for new users
    Given I set this test to start with the following data:
      | flow    |
      | Default |
    And I am in Dashboard page
    And I close the onboarding
    And The page does have element upload document button
    And I click element <element>
    And I wait 1 seconds
    And I wait for element <waitElement>
    When I take a screenshot of the current page
    Then the comparison of <page> page should be correct

    @PDFEDITOR_VISUAL_DASHBOARD
    Examples: Dashboard
      | page      | element                  | waitElement            |
      | Dashboard | dashboard side menu link | open document 0 button |

    @PDFEDITOR_VISUAL_DASHBOARD_MY_DOCUMENTS
    Examples: Dashboard My Documents
      | page                   | element                               | waitElement               |
      | Dashboard My Documents | dashboard my documents side menu link | open my document 0 button |

    @PDFEDITOR_VISUAL_DASHBOARD_MOST_USED_FORMS
    Examples: Dashboard Most Used Forms
      | page                      | element                                  | waitElement        |
      | Dashboard Most Used Forms | dashboard most used forms side menu link | open form 0 button |

    @PDFEDITOR_VISUAL_DASHBOARD_TRASH
    Examples: Dashboard Trash Bin
      | page                | element                        | waitElement |
      | Dashboard Trash Bin | dashboard trash side menu link | trash icon  |

  @PDFEDITOR_VISUAL_DASHBOARD_DELETE_MODAL
  Scenario: Visual comparison of the Dashboard delete modal
    Given I set this test to start with the following data:
      | flow    |
      | Default |
    When I am in Dashboard page
    Then I close the onboarding
    And I delete a document and open delete modal
    And I click element dashboard trash side menu link
    And I open delete modal
    And I take a screenshot of the current page
    And the comparison of Dashboard Delete Modal page should be correct

  Scenario Outline: Visual comparison of all products
    Given I am in product landing page <landingAlt>
    Then I wait for element upload button
    And I take a screenshot of the current page
    And the comparison of <page> page should be correct

    @PDFEDITOR_VISUAL_PRODUCT_COMPRESS
    Examples: Compress PDF Product
      | page     | landingAlt  |
      | Compress | compressPDF |

    @PDFEDITOR_VISUAL_PRODUCT_EDIT
    Examples: Edit PDF Product
      | page | landingAlt |
      | Edit | editPDF    |

    @PDFEDITOR_VISUAL_PRODUCT_EDIT_FILL
    Examples: Edit Fill PDF Product
      | page      | landingAlt  |
      | Edit Fill | editFillPDF |

    @PDFEDITOR_VISUAL_PRODUCT_EDIT_SCANNED
    Examples: Edit Scanned PDF Product
      | page         | landingAlt     |
      | Edit Scanned | editScannedPDF |

    @PDFEDITOR_VISUAL_PRODUCT_INSERT_IMAGE
    Examples: Insert Image PDF Product
      | page         | landingAlt  |
      | Insert Image | insertImage |

    @PDFEDITOR_VISUAL_PRODUCT_WATERMARK
    Examples: Watermark PDF Product
      | page      | landingAlt |
      | Watermark | watermark  |

    @PDFEDITOR_VISUAL_PRODUCT_ROTATE
    Examples: Rotate PDF Product
      | page   | landingAlt |
      | Rotate | rotatePDF  |

    @PDFEDITOR_VISUAL_PRODUCT_DELETE_PAGES
    Examples: Delete Pages PDF Product
      | page         | landingAlt     |
      | Delete Pages | deletePdfPages |

    @PDFEDITOR_VISUAL_PRODUCT_PDF_READER
    Examples: PDF Reader Product
      | page       | landingAlt |
      | PDF Reader | pdfReader  |

    @PDFEDITOR_VISUAL_PRODUCT_WORD_TO_PDF
    Examples: Word To PDF Product
      | page        | landingAlt |
      | Word To PDF | wordToPDF  |

    @PDFEDITOR_VISUAL_PRODUCT_JPG_TO_PDF
    Examples: JPG To PDF Product
      | page       | landingAlt |
      | JPG To PDF | jpgToPDF   |

    @PDFEDITOR_VISUAL_PRODUCT_PNG_TO_PDF
    Examples: PNG To PDF Product
      | page       | landingAlt |
      | PNG To PDF | pngToPDF   |

    @PDFEDITOR_VISUAL_PRODUCT_POWERPOINT_TO_PDF
    Examples: PowerPoint To PDF Product
      | page              | landingAlt |
      | PowerPoint To PDF | pwpToPDF   |

    @PDFEDITOR_VISUAL_PRODUCT_EXCEL_TO_PDF
    Examples: Excel To PDF Product
      | page         | landingAlt |
      | Excel To PDF | excelToPDF |

    @PDFEDITOR_VISUAL_PRODUCT_SIGN
    Examples: Sign PDF Product
      | page | landingAlt |
      | Sign | signPdf    |

    @PDFEDITOR_VISUAL_PRODUCT_PDF_TO_WORD
    Examples: PDF To Word Product
      | page        | landingAlt          |
      | PDF To Word | howToConvertPdfWord |

    @PDFEDITOR_VISUAL_PRODUCT_PDF_TO_JPG
    Examples: PDF To JPG Product
      | page       | landingAlt |
      | PDF To JPG | pdfToJpg   |

    @PDFEDITOR_VISUAL_PRODUCT_PDF_TO_PNG
    Examples: PDF To PNG Product
      | page       | landingAlt |
      | PDF To PNG | pdfToPng   |

    @PDFEDITOR_VISUAL_PRODUCT_PDF_TO_POWERPOINT
    Examples: PDF To PowerPoint Product
      | page              | landingAlt |
      | PDF To PowerPoint | pdfToPwp   |

    @PDFEDITOR_VISUAL_PRODUCT_PDF_TO_EXCEL
    Examples: PDF To Excel Product
      | page         | landingAlt |
      | PDF To Excel | pdfToExcel |

    @PDFEDITOR_VISUAL_PRODUCT_SPLIT
    Examples: Split PDF Product
      | page  | landingAlt |
      | Split | splitPdf   |

    @PDFEDITOR_VISUAL_PRODUCT_MERGE
    Examples: Merge PDF Product
      | page  | landingAlt |
      | Merge | mergePDF   |