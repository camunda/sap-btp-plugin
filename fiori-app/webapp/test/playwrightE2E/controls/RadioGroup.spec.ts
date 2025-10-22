import { test, expect } from "@playwright/test"
import { fetchVariableFromProcessInstance, startProcessInstance, waitForProcessCompletion } from "../helpers"
import Page from "@playwright/test"

test.describe("RadioGroup Control E2E Test (process_45_radiogroup)", () => {
  test("should hide radio button groups according to hidden expression and hidden fields should not be submitted", async ({
    page
  }) => {
    const processDefinitionId = "process_45_radiogroup"
    const instanceKey = await startProcessInstance(processDefinitionId, page)

    // setup is a radio button with two options
    // two other radio button grous are visible, when none of the options is selected
    await expect(page.getByText("Option 1 selected")).toBeVisible()
    await expect(page.getByText("Option 2 selected")).toBeVisible()

    await page.getByRole("radio", { name: "option1", exact: true }).click()

    // the hide expression should hide one of the radio button groups if option 1 is selected
    await expect(page.getByText("Option 1 selected")).toBeVisible()
    await expect(page.getByText("Option 2 selected")).toBeHidden()

    await page.getByRole("radio", { name: "option2" }).click()

    // ...the other hide expression should hide the other radio button group if option 2 is selected
    await expect(page.getByText("Option 2 selected")).toBeVisible()
    await expect(page.getByText("Option 1 selected")).toBeHidden()

    // after testing the UI, we finish the user task and check the variables
    await page.getByRole("button", { name: "Next" }).click()
    await page.getByRole("button", { name: "finish Process" }).click()

    await waitForProcessCompletion(instanceKey)

    // check variables. The hidden field should not be submitted
    expect(await fetchVariableFromProcessInstance(instanceKey, "radio_value_2")).toEqual('"SomeValueOption2"')
    expect(await fetchVariableFromProcessInstance(instanceKey, "radio_value_1")).toBeUndefined()
  })
})
