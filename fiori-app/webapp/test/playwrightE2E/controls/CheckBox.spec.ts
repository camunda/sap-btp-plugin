import { test, expect } from "@playwright/test"
import { fetchVariableFromProcessInstance, startProcessInstance, waitForProcessCompletion } from "../helpers"
import Page from "@playwright/test"

test.describe("Checkbox Control E2E Test (process_45_checkbox)", () => {
  test("should hide checkbox controls according to hidden expression and hidden fields should not be submitted", async ({
    page
  }) => {
    const processDefinitionId = "process_45_checkbox"
    const instanceKey = await startProcessInstance(processDefinitionId, page)

    await expect(page.getByRole("checkbox", { name: "Checkbox" })).toBeHidden()

    await page.getByRole("checkbox", { name: "Visibility is hidden" }).click()
    await expect(page.getByRole("checkbox", { name: "Checkbox" })).toBeVisible()

    await page.getByRole("checkbox", { name: "Visibility is hidden" }).click()
    await expect(page.getByRole("checkbox", { name: "Checkbox" })).toBeHidden()

    // finish process and check variables
    await page.getByRole("button", { name: "Next" }).click()
    await page.getByRole("button", { name: "finish Process" }).click()
    await waitForProcessCompletion(instanceKey)

    // check variables. The hidden field should not be submitted
    expect(await fetchVariableFromProcessInstance(instanceKey, "checkbox_1")).toBeUndefined()
  })
})
