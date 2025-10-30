import { test, expect } from "@playwright/test"
import { fetchVariableFromProcessInstance, startProcessInstance, waitForProcessCompletion } from "../helpers"
import Page from "@playwright/test"

test.describe("Input Control E2E Test (process_45_input)", () => {
  test("should hide input controls according to hidden expression and hidden fields should not be submitted", async ({
    page
  }) => {
    const processDefinitionId = "process_45_input"
    const instanceKey = await startProcessInstance(processDefinitionId, page)

    await expect(page.getByText('Decision equals not "Option 2"')).toBeVisible()
    await expect(page.getByText('Decision equals not "Option 1"')).toBeVisible()

    // part of the setup: fill both fields that should be hidden later, should retain their values when visible again
    await page.getByRole("textbox", { name: 'Decision equals not "Option 1"' }).fill("Something")
    await page.getByRole("textbox", { name: 'Decision equals not "Option 2"' }).fill("Something")

    // test 1: fill in "Option 2", should hide first input
    await page.getByRole("textbox", { name: "Decision", exact: true }).fill("Option 2")

    await expect(page.getByText('Decision equals not "Option 2"')).toBeHidden()
    await expect(page.getByText('Decision equals not "Option 1"')).toBeVisible()

    // test 2: enter text "Option 1", should hide second inputand show first again with retained value
    await page.getByRole("textbox", { name: "Decision", exact: true }).fill("Option 1")

    await expect(page.getByText('Decision equals not "Option 2"')).toBeVisible()
    await expect(page.getByRole("textbox", { name: 'Decision equals not "Option 2"' })).toHaveValue("Something")
    await expect(page.getByText('Decision equals not "Option 1"')).toBeHidden()

    // finish process and check variables
    await page.getByRole("button", { name: "Next" }).click()
    await page.getByRole("button", { name: "finish Process" }).click()
    await waitForProcessCompletion(instanceKey)

    // check variables. The hidden field should not be submitted
    expect(await fetchVariableFromProcessInstance(instanceKey, "input_value_1")).toEqual('"Something"')
    expect(await fetchVariableFromProcessInstance(instanceKey, "input_value_2")).toBeUndefined()
  })
})
