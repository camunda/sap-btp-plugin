import { test, expect } from "@playwright/test"
import { fetchProcessInstanceById, fetchProcessInstances } from "./helpers"

test.describe("Basic E2E Tests to start and complete a process", () => {
  test("App loads and shows title", async ({ page }) => {
    await page.goto("/") // nutzt baseURL
    await expect(page).toHaveTitle(/Camunda SAP BTP Integration/i)
  })

  test("Start process via UI and check instances on camunda", async ({ page }) => {
    const processDefinitionId = "e2eTestProcess"
    let currentInstance: { processInstanceKey: string; state: string }

    await page.goto("/")

    // fetch instances before starting a new one
    const instancesBefore = (await fetchProcessInstances(processDefinitionId)).page.totalItems

    await page.getByRole("button", { name: "menu2" }).click()
    await page.getByRole("menuitem", { name: "run this process..." }).click()
    await page.locator('[id="__component0---app--processName-inner"]').fill(processDefinitionId)
    await page.getByRole("button", { name: "start above process" }).click()

    await expect(page.getByText("Success! This form is delivered by Camunda.")).toBeVisible()

    await expect(page.getByRole("button", { name: "Next" })).toBeVisible()
    await page.getByRole("button", { name: "Next" }).click()

    // Polling until the process instance count increases by 1. This is necessary because starting a process might take some time.
    await expect
      .poll(
        async () => {
          const instances = await fetchProcessInstances(processDefinitionId)
          currentInstance = instances.items[0] as { processInstanceKey: string; state: string }
          return instances.page.totalItems
        },
        {
          message: `Process instance should be increased to ${instancesBefore + 1}`,
          timeout: 10000 // timeout after 10 sec
        }
      )
      .toBe(instancesBefore + 1)

    await page.getByRole("button", { name: "finish Process" }).click()

    // Polling current process until its state is COMPLETED
    await expect
      .poll(
        async () => {
          const instance = await fetchProcessInstanceById(currentInstance.processInstanceKey)
          return instance.state
        },
        {
          message: `Process should be COMPLETED`,
          timeout: 10000 // timeout after 10 sec
        }
      )
      .toBe("COMPLETED")
  })

  test("Start process via URL and check instances on camunda", async ({ page }) => {
    const processDefinitionId = "e2eTestProcess"
    let currentInstance: { processInstanceKey: string; state: string }
    await page.goto("?run=" + processDefinitionId)

    // fetch instances before starting a new one
    const instances = await fetchProcessInstances(processDefinitionId)
    const instancesBefore = instances.page.totalItems

    await expect(page.getByText("Success! This form is delivered by Camunda.")).toBeVisible()

    await expect(page.getByRole("button", { name: "Next" })).toBeVisible()
    await page.getByRole("button", { name: "Next" }).click()

    // Polling until the process instance count increases by 1. This is necessary because starting a process might take some time.
    await expect
      .poll(
        async () => {
          const instances = await fetchProcessInstances(processDefinitionId)
          currentInstance = instances.items[0] as { processInstanceKey: string; state: string }
          return instances.page.totalItems
        },
        {
          message: `Process instance should be increased to ${instancesBefore + 1}`,
          timeout: 10000 // timeout after 10 sec
        }
      )
      .toBe(instancesBefore + 1)

    await page.getByRole("button", { name: "finish Process" }).click()

    // Polling current process until its state is COMPLETED
    await expect
      .poll(
        async () => {
          const instance = await fetchProcessInstanceById(currentInstance.processInstanceKey)
          return instance.state
        },
        {
          message: `Process should be COMPLETED`,
          timeout: 10000 // timeout after 10 sec
        }
      )
      .toBe("COMPLETED")
  })
})
