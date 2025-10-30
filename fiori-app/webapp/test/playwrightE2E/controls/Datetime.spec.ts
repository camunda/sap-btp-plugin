import { test, expect } from "@playwright/test"
import { fetchVariableFromProcessInstance, startProcessInstance, waitForProcessCompletion } from "../helpers"
import Page from "@playwright/test"

test.describe("Datetime Control E2E Test (process_45_datetime)", () => {
  test("should hide datetime controls according to hidden expression and hidden fields should not be submitted", async ({
    page
  }) => {
    const processDefinitionId = "process_45_datetime"
    const instanceKey = await startProcessInstance(processDefinitionId, page)

    await expect(page.locator('[id$="control"]')).toBeVisible()
    await expect(page.locator('[id$="check"]')).toBeVisible()

    await page.locator('[id$="check-inner"]').fill("2025-10-28")

    await page.locator('[id$="control-inner"]').fill("2025-10-27")
    await page.locator('[id$="control-inner"]').press("Tab")

    await expect(page.locator('[id$="check"]')).toBeHidden()

    // finish process and check variables
    await page.getByRole("button", { name: "Next" }).click()
    await page.getByRole("button", { name: "finish Process" }).click()
    await waitForProcessCompletion(instanceKey)

    // check variables. The hidden field should not be submitted
    expect(await fetchVariableFromProcessInstance(instanceKey, "check")).toBeUndefined()
    expect(await fetchVariableFromProcessInstance(instanceKey, "control")).toEqual('"2025-10-27"')
  })
})
