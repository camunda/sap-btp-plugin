import { test, expect } from "@playwright/test"
import { fetchForceVariableFromProcessInstance } from "../helpers"

test.describe("RadioGroup Control E2E Test", () => {
  test.only("should retrieve variable from UI5 and verify API call", async ({ page }) => {
    let switchVariable: string
    const processDefinitionId = "process_45_radiogroup"
    await page.goto("?run=" + processDefinitionId)
    await page.getByRole("button", { name: "Next" }).click()
    switchVariable = (await fetchForceVariableFromProcessInstance("switch", "", page)) as string
    console.log("Fetched switch variable:", switchVariable)
  })
})
