import { test, expect } from "@playwright/test"
import { fetchVariableFromProcessInstance, startProcessInstance, waitForProcessCompletion } from "../helpers"
import Page from "@playwright/test"

test.describe("select Control E2E Test (process_45_select)", () => {
  test.only("should hide select controls according to hidden expression and hidden fields should not be submitted", async ({
    page
  }) => {
    const processDefinitionId = "process_45_select"
    const instanceKey = await startProcessInstance(processDefinitionId, page)

    // setup is a select with two options. Second should be initial hidden, bc value in select is preset as default value "Option 1"
    await expect(page.getByText("Option 1: Decision equals not Option 2")).toBeVisible()
    await expect(page.getByText("Option 2: Decision equals not Option 1")).toBeHidden()

    // part of the setup: fill both fields that should be hidden later, should retain their values when visible again
    await page.locator('[id$="-switch-arrow"]').click()
    await page.getByRole("option", { name: "Option 2" }).click()

    // test 1: select option 2, should hide first radio group
    await expect(page.getByText("Option 1: Decision equals not Option 2")).toBeHidden()
    await expect(page.getByText("Option 2: Decision equals not Option 1")).toBeVisible()

    // finish process and check variables
    await page.getByRole("button", { name: "Next" }).click()
    await page.getByRole("button", { name: "finish Process" }).click()
    await waitForProcessCompletion(instanceKey)

    // check variables. The hidden field should not be submitted
    expect(await fetchVariableFromProcessInstance(instanceKey, "select_option_1")).toBeUndefined()
    expect(await fetchVariableFromProcessInstance(instanceKey, "select_option_2")).toEqual('"value"')
  })
})
