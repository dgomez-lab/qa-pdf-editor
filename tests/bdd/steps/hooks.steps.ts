import { After, Before, test } from '../fixtures'
import {
  activatePdfhintScenarioEnv,
  deactivatePdfhintScenarioEnv,
  isPdfhintScenario
} from '../../helpers/pdfhintScenario'
import { persistFailureScreenshot } from '../../helpers/failureScreenshot'
import { logConfigOnce, logScenarioEnd, logScenarioStart, printBanner } from '../bddLogger'

Before(async ({ bddWorld }) => {
  const testInfo = test.info()
  printBanner()
  logConfigOnce()
  logScenarioStart(testInfo.title)
  if (!bddWorld.email?.trim()) {
    bddWorld.email =
      process.env.PLAYWRIGHT_TEST_EMAIL?.trim() ||
      `playwright+bdd+${Date.now()}-${Math.random().toString(36).slice(2, 9)}@example.com`
  }
})

Before({ tags: '@PDFHINT' }, async () => {
  activatePdfhintScenarioEnv()
})

After({ tags: '@PDFHINT' }, async () => {
  deactivatePdfhintScenarioEnv()
})

After(async ({ page }) => {
  if (isPdfhintScenario()) {
    deactivatePdfhintScenarioEnv()
  }
  const testInfo = test.info()
  const passed = testInfo.status === testInfo.expectedStatus
  let lastUrl: string | undefined
  try {
    lastUrl = page.url()
  } catch {
    lastUrl = undefined
  }
  if (!passed) {
    await persistFailureScreenshot(page, testInfo)
  }
  logScenarioEnd(testInfo.title, passed, passed ? undefined : lastUrl)
})
