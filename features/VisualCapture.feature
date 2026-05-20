# Remember to activate headless mode in order to run these scenarios locally!
@MANUAL_SCREEN_CAPTURE
Feature: REFERENCE SCREEN - Taking reference screenshots for given pages

  Scenario Outline: Take a base screenshot of base pages
    Given I set this test to start with the following data:
      | flow   |
      | Direct |
    When I am in <page> page
    Then I wait 6 seconds
    And I take a reference screenshot of <page> page

    Examples: Home
      | page |
      | Home |

    Examples: Login
      | page  |
      | Login |

    Examples: Editor
      | page   |
      | Editor |
  
  Scenario: Take a base screenshot of Account pages
    Given I set this test to start with the following data:
      | flow    |
      | Default |
    When I am in Account page
    Then I take a reference screenshot of Account page
    
  Scenario: Take a base screenshot of Account Canceled page
    Given I set this test to start with the following data:
      | flow    |
      | Default |
    And I am in Account page
    And I click element membership link
    And I wait for element cancel subscription link
    And I click element cancel subscription link
    And I wait for element yes unsubscribe button
    And I click element yes unsubscribe button
    When I wait for unsubscribe process to finish
    Then I take a reference screenshot of Account Canceled page

  Scenario: Take a base screenshot of Forms pages
    Given I am in Home page
    When I click element forms header link
    Then I take a reference screenshot of Forms page

  Scenario: Take a base screenshot of home upload modal
    Given I am in Home page
    When I scroll to element try now button
    Then I click element try now button
    And I take a reference screenshot of Upload Modal page
  
  Scenario: Take a base screenshot of editor modal of a non paid user
    Given I am in Editor page
    When I wait for element download button
    Then I wait 6 seconds
    And I wait until hide element loading overlay
    And I click element download button
    And I take a reference screenshot of Editor Modal No Paid page

  Scenario: Take a base screenshot of editor modal of a paid user
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
    And I take a reference screenshot of Editor Modal Paid page

  Scenario: Take a base screenshot of editor convert modal for a paid user
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
    And I take a reference screenshot of Editor Modal Convert Paid page

  Scenario: Take a base screenshot of editor email share modal for a paid user
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
    And I take a reference screenshot of Editor Select Mail To Share Modal page

  Scenario: Take a base screenshot of editor payment modal
    Given I am in Editor page
    When I click next button
    Then I create a new user from the editor
    And I wait for element transaction price text
    And I take a reference screenshot of Editor Payment Modal page

  Scenario Outline: Take a base screenshot of other base pages
    Given I am in Home page
    When I click element <element>
    Then I take a reference screenshot of <page> page

    Examples: About Us
      | page     | element              |
      | About Us | about us footer link |

    Examples: FAQs
      | page | element          |
      | FAQs | faqs footer link |

    Examples: Contact
      | page    | element             |
      | Contact | contact footer link |

  Scenario Outline: Take a base screenshot of other base pages in other tab
    Given I am in Home page
    When I click element <element>
    Then I go into new opened window
    And I take a reference screenshot of <page> page

    Examples: Downloads
      | page      | element               |
      | Downloads | downloads footer link |

    Examples: Terms of Use
      | page         | element                  |
      | Terms of Use | terms of use footer link |

    Examples: Privacy Policy
      | page           | element                    |
      | Privacy Policy | privacy policy footer link |

    Examples: Terms and Conditions
      | page                 | element                          |
      | Terms and Conditions | terms and conditions footer link |

    Examples: Cookies
      | page    | element             |
      | Cookies | cookies footer link |
  
  Scenario: Take a base screenshot of unsubscribe screen
    Given I set this test to start with the following data:
      | flow    |
      | Default |
    And I am in Account page
    When I wait for element membership link
    Then I click element membership link
    And I wait for element cancel subscription link
    And I click element cancel subscription link
    And I wait for element yes unsubscribe button
    And I take a reference screenshot of Unsubscribe page

  Scenario Outline: Take a base screenshot of all forms in editor page
    Given I am in Home page
    When I click element forms header link
    Then I wait for element <element>
    And I click element <element>
    And I wait for element get started button
    And I click element get started button
    And I am redirected to Editor page
    And I wait 6 seconds
    And I wait for element download button
    And I take a reference screenshot of <page> page

    Examples: Form W4
      | page    | element      |
      | Form W4 | form w4 link |

    Examples: Form W9
      | page    | element      |
      | Form W9 | form w9 link |

    Examples: Form 1040 2021
      | page           | element             |
      | Form 1040 2021 | form 1040 2021 link |

    Examples: Form 1040
      | page      | element        |
      | Form 1040 | form 1040 link |

    Examples: Form Social
      | page        | element          |
      | Form Social | form social link |

    Examples: Form 1099
      | page      | element        |
      | Form 1099 | form 1099 link |

    Examples: Form 1099 Nec
      | page          | element            |
      | Form 1099 Nec | form 1099 nec link |

    Examples: Form W2
      | page    | element      |
      | Form W2 | form w2 link |

    Examples: Form 1095
      | page      | element        |
      | Form 1095 | form 1095 link |

    Examples: Form Philippines
      | page             | element               |
      | Form Philippines | form philippines link |

    Examples: Form 941
      | page     | element       |
      | Form 941 | form 941 link |

    Examples: Form Feedex
      | page        | element          |
      | Form Feedex | form feedex link |

    Examples: Form Da
      | page    | element      |
      | Form Da | form da link |

    Examples: Form Schedule
      | page          | element            |
      | Form Schedule | form schedule link |

    Examples: Form Ds11
      | page      | element        |
      | Form Ds11 | form ds11 link |

    Examples: Form Obituary
      | page          | element            |
      | Form Obituary | form obituary link |

    Examples: Form Marriage
      | page          | element            |
      | Form Marriage | form marriage link |

    Examples: Form Gift
      | page      | element        |
      | Form Gift | form gift link |

  Scenario: Take a base screenshot of 404 page
    Given I am in Home page
    When I click element forms header link
    Then I wait for element form w4 link
    And I click element logo
    And I force a wrong URL
    And I take a reference screenshot of 404 page

  Scenario: Take a base screenshot of the Dashboard onboarding for new users
    Given I set this test to start with the following data:
      | flow    |
      | Default |
    When I am in Dashboard page
    Then I wait 3 seconds
    And I wait for element onboarding close modal button
    And I click element onboarding close modal button
    And I wait for element onboarding view tutorial button
    And I take a reference screenshot of Dashboard Onboarding page


  Scenario Outline: Take a base screenshot of the Dashboard
    Given I set this test to start with the following data:
      | flow    |
      | Default |
    When I am in Dashboard page
    Then I close the onboarding
    And The page does have element upload document button
    And I click element <element>
    And I wait for element <waitElement>
    And I take a reference screenshot of <page> page
    
    Examples: Dashboard
      | page      | element                  | waitElement            |
      | Dashboard | dashboard side menu link | open document 0 button |
    
    Examples: Dashboard My Documents
      | page                   | element                               | waitElement               |
      | Dashboard My Documents | dashboard my documents side menu link | open my document 0 button |
    
    Examples: Dashboard Most Used Forms
      | page                      | element                                  | waitElement        |
      | Dashboard Most Used Forms | dashboard most used forms side menu link | open form 0 button |
    
    Examples: Dashboard Trash Bin
      | page                | element                        | waitElement |
      | Dashboard Trash Bin | dashboard trash side menu link | trash icon  |
  
  Scenario: Take a base screenshot of the Dashboard delete modal
    Given I set this test to start with the following data:
      | flow    |
      | Default |
    When I am in Dashboard page
    Then I close the onboarding
    And I delete a document and open delete modal
    And I click element dashboard trash side menu link
    And I open delete modal
    And I take a reference screenshot of Dashboard Delete Modal page

  Scenario Outline: Take a base screenshot of all products
    Given I am in product landing page <landingAlt>
    Then I wait for element upload button
    And I take a reference screenshot of <page> page

    Examples: Compress PDF Product
      | page     | landingAlt  |
      | Compress | compressPDF |

    Examples: Edit PDF Product
      | page | landingAlt |
      | Edit | editPDF    |

    Examples: Edit Fill PDF Product
      | page      | landingAlt  |
      | Edit Fill | editFillPDF |

    Examples: Edit Scanned PDF Product
      | page         | landingAlt     |
      | Edit Scanned | editScannedPDF |

    Examples: Insert Image PDF Product
      | page         | landingAlt  |
      | Insert Image | insertImage |

    Examples: Watermark PDF Product
      | page      | landingAlt |
      | Watermark | watermark  |

    Examples: Rotate PDF Product
      | page   | landingAlt |
      | Rotate | rotatePDF  |

    Examples: Delete Pages PDF Product
      | page         | landingAlt     |
      | Delete Pages | deletePdfPages |

    Examples: PDF Reader Product
      | page       | landingAlt |
      | PDF Reader | pdfReader  |

    Examples: Word To PDF Product
      | page        | landingAlt |
      | Word To PDF | wordToPDF  |

    Examples: JPG To PDF Product
      | page       | landingAlt |
      | JPG To PDF | jpgToPDF   |

    Examples: PNG To PDF Product
      | page       | landingAlt |
      | PNG To PDF | pngToPDF   |

    Examples: PowerPoint To PDF Product
      | page              | landingAlt |
      | PowerPoint To PDF | pwpToPDF   |

    Examples: Excel To PDF Product
      | page         | landingAlt |
      | Excel To PDF | excelToPDF |

    Examples: Sign PDF Product
      | page | landingAlt |
      | Sign | signPdf    |

    Examples: PDF To Word Product
      | page        | landingAlt          |
      | PDF To Word | howToConvertPdfWord |

    Examples: PDF To JPG Product
      | page       | landingAlt |
      | PDF To JPG | pdfToJpg   |

    Examples: PDF To PNG Product
      | page       | landingAlt |
      | PDF To PNG | pdfToPng   |

    Examples: PDF To PowerPoint Product
      | page              | landingAlt |
      | PDF To PowerPoint | pdfToPwp   |

    Examples: PDF To Excel Product
      | page         | landingAlt |
      | PDF To Excel | pdfToExcel |

    Examples: Split PDF Product
      | page  | landingAlt |
      | Split | splitPdf   |

    Examples: Merge PDF Product
      | page  | landingAlt |
      | Merge | mergePDF   |