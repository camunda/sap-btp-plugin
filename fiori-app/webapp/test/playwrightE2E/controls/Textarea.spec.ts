import { test, expect } from "@playwright/test"
import { fetchVariableFromProcessInstance, startProcessInstance, waitForProcessCompletion } from "../helpers"
import Page from "@playwright/test"

test.describe("Textarea Control E2E Test (process_45_textarea)", () => {
  test("should hide textarea controls according to hidden expression and hidden fields should not be submitted", async ({
    page
  }) => {
    const processDefinitionId = "process_45_textarea"
    const instanceKey = await startProcessInstance(processDefinitionId, page)

    await expect(page.getByRole("textbox", { name: "Text area" })).toBeHidden()

    await page.getByRole("checkbox", { name: "Visibility is hidden" }).click()
    await expect(page.getByRole("textbox", { name: "Text area" })).toBeVisible()

    await page.getByRole("checkbox", { name: "Visibility is hidden" }).click()
    await expect(page.getByRole("textbox", { name: "Text area" })).toBeHidden()

    // finish process and check variables
    await page.getByRole("button", { name: "Next" }).click()
    await page.getByRole("button", { name: "finish Process" }).click()
    await waitForProcessCompletion(instanceKey)

    // check variables. The hidden field should not be submitted
    expect(await fetchVariableFromProcessInstance(instanceKey, "textarea")).toBeUndefined()
    expect(await fetchVariableFromProcessInstance(instanceKey, "textarea_control")).toEqual('"Control Textarea"')
  })
})
