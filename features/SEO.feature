# SEO: ensure marketing/navigation <a href> values are absolute https URLs (not root-relative paths).
# Technical assets (/_next/, scripts) are out of scope.

Feature: SEO — absolute navigation links (Home and Forms)

  @PDFEDITOR_SEO_HOME_HEADER_ABSOLUTE_HREFS
  Scenario: Header links on Home use absolute http(s) URLs
    Given I set this test to start with the following data:
      | flow   |
      | Direct |
    When I am in Home page
    Then every link in the Home page header should have an absolute http or https URL

  @PDFEDITOR_SEO_HOME_LANDING_ABSOLUTE_HREFS
  Scenario: Landing page links on Home use absolute http(s) URLs
    Given I set this test to start with the following data:
      | flow   |
      | Direct |
    When I am in Home page
    Then every landing page link on Home should have an absolute http or https URL

  @PDFEDITOR_SEO_HOME_FOOTER_ABSOLUTE_HREFS
  Scenario: Footer links on Home use absolute http(s) URLs
    Given I set this test to start with the following data:
      | flow   |
      | Direct |
    When I am in Home page
    Then every link in the Home page footer should have an absolute http or https URL

  @PDFEDITOR_SEO_FORMS_MOST_USED_ABSOLUTE_HREFS
  Scenario: Most-used form links on /forms use absolute http(s) URLs
    Given I set this test to start with the following data:
      | flow   |
      | Direct |
    When I open the forms page for SEO link checks
    Then every most-used form link on the forms page should have an absolute http or https URL
