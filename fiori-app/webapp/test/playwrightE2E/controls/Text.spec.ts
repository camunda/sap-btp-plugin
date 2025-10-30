import { test, expect } from "@playwright/test"
import { fetchVariableFromProcessInstance, startProcessInstance, waitForProcessCompletion } from "../helpers"
import Page from "@playwright/test"

test.describe("Text Control E2E Test (process_45_text)", () => {
  test("should hide text controls according to hidden expression", async ({ page }) => {
    const processDefinitionId = "process_45_text"
    await startProcessInstance(processDefinitionId, page)

    await expect(page.getByRole("heading", { name: "Text" })).toBeHidden()

    await page.getByRole("radio", { name: "Visible" }).click()

    await expect(page.getByRole("heading", { name: "Text" })).toBeVisible()
  })
})
