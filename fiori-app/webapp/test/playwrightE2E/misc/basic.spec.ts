import { test, expect } from "@playwright/test"
import { fetchProcessInstances, startProcessInstance, waitForProcessCompletion, getTopology } from "./../helpers"

test.describe("Basic E2E Tests to start and complete a process", () => {
  test("App loads and shows title", async ({ page }) => {
    await page.goto("/") // nutzt baseURL
    await expect(page).toHaveTitle(/Camunda SAP BTP Integration/i)
  })

  
  test("Start process via UI and check instances on camunda as jobWorker", async ({ page }) => {
    const processDefinitionId = "jobworker"

    // Set up waitForResponse BEFORE navigation
    const responsePromise = page.waitForResponse(
      (response) => {
        return response.url().includes("runProcess")
      },
      { timeout: 30000 }
    )

    await page.goto("/")

    await page.getByRole("button", { name: "menu2" }).click()
    await page.getByRole("menuitem", { name: "run this process..." }).click()
    await page.locator('[id="__component0---app--processName-inner"]').fill(processDefinitionId)
    await page.getByRole("button", { name: "start above process" }).click()

    const response = await responsePromise

    if (response.status() !== 200) {
      throw new Error(`runProcess returned ${response.status()}: ${response.statusText()}`)
    }
    const currentInstance = await response.json()

    await expect(page.getByText("Process started - Step 1")).toBeVisible()

    await expect(page.getByRole("button", { name: "Next" })).toBeVisible()

    await page.getByRole("button", { name: "Next" }).click()

    await expect(page.getByText("Process started - Step 2")).toBeVisible()

    await expect(page.getByRole("button", { name: "Next" })).toBeVisible()

    await page.getByRole("button", { name: "Next" }).click()

    await page.getByRole("button", { name: "finish Process" }).click()

    await waitForProcessCompletion(currentInstance.processInstanceKey)
  })


  test("Start process via URL and check instances on camunda as job worker", async ({ page }) => {
    const processDefinitionId = "jobworker"

    const instanceKey = await startProcessInstance(processDefinitionId, page)

    await expect(page.getByText("Process started - Step 1")).toBeVisible()

    await expect(page.getByRole("button", { name: "Next" })).toBeVisible()

    await page.getByRole("button", { name: "Next" }).click()

    await expect(page.getByText("Process started - Step 2")).toBeVisible()

    await expect(page.getByRole("button", { name: "Next" })).toBeVisible()

    await page.getByRole("button", { name: "Next" }).click()

    await page.getByRole("button", { name: "finish Process" }).click()

    await waitForProcessCompletion(instanceKey)
  })

  test("Start process via URL and check instances on camunda as camunda user task", async ({ page }) => {
    const topology = await getTopology()
    test.skip(topology.gatewayVersion < "8.8", "This test is skipped for camunda platform below 8.8")

    const processDefinitionId = "camundausertask"

    const instanceKey = await startProcessInstance(processDefinitionId, page)

    await expect(page.getByText("Process started - Step 1")).toBeVisible()

    await expect(page.getByRole("button", { name: "Next" })).toBeVisible()

    await page.getByRole("button", { name: "Next" }).click()

    await expect(page.getByText("Process started - Step 2")).toBeVisible()

    await expect(page.getByRole("button", { name: "Next" })).toBeVisible()

    await page.getByRole("button", { name: "Next" }).click()

    await page.getByRole("button", { name: "finish Process" }).click()

    await waitForProcessCompletion(instanceKey)
  })
})
