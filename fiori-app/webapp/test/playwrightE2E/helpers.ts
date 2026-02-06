import test, { expect, Page } from "@playwright/test"

const camundaRest = (globalThis as any).process?.env?.CAMUNDA_REST_ADDRESS ?? "http://localhost:8080"

/**
 * fetch variable from camunda backend by calling process instance variable endpoint
 *
 * @param processInstanceKey key of running (must) process instance
 * @param variableName variable name to fetch
 * @returns variable value
 */
async function fetchVariableFromProcessInstance(processInstanceKey: string, variableName: string): Promise<any> {
  const response = await fetch(`${camundaRest}/v2/variables/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      filter: {
        processInstanceKey: processInstanceKey,
        name: variableName
      }
    })
  })
  const data = await response.json()
  return data.items[0]?.value
}

/**
 * Get variable from camunda backend by calling process instance variable endpoint
 *
 * @param variableName variable to fetch from browser session
 * @param processInstanceKey process instance identifier
 * @returns
 */
async function pollVariableFromProcessInstance(variableName: string, processInstanceKey: string): Promise<any> {
  let variable: string

  await expect
    .poll(
      async () => {
        variable = (await fetchVariableFromProcessInstance(processInstanceKey, variableName)) as string
        return variable
      },
      {
        timeout: 10000,
        message: "Waiting for switch variable to be set in process instance"
      }
    )
    .not.toBeUndefined()
  return variable
}

/**
 * Start a new process instance by navigating to the fiori app with ?run=processDefinitionId
 *
 * Uses ONLY waitForResponse - the most reliable method
 *
 * @param processDefinitionId camunda process definition used in Camunda GUI
 * @param page page object of playwright
 * @returns process instance key of started process
 */
async function startProcessInstance(processDefinitionId: string, page: Page): Promise<string> {
  // Use baseURL from config, fallback to current URL if already on the app
  let currentUrl = page.url()

  // If we're on about:blank or empty, use the baseURL from config
  if (currentUrl === "about:blank" || currentUrl === "" || !currentUrl.includes("localhost")) {
    const baseURL = (page.context() as any)._options?.baseURL || "http://localhost:5001/app/index.html"
    currentUrl = baseURL
  }

  const url = new URL(currentUrl)
  url.searchParams.set("run", processDefinitionId)
  const targetUrl = url.toString()

  // Set up waitForResponse BEFORE navigation
  const responsePromise = page.waitForResponse((response) => response.url().includes("runProcess"), { timeout: 30000 })

  // Navigate after response listener is set up
  await page.goto(targetUrl, { waitUntil: "domcontentloaded" })

  // Wait for the response
  try {
    const response = await responsePromise

    const responseJSON = await response.json()

    if (response.status() !== 200) {
      throw new Error(`runProcess returned ${response.status()}: ${response.statusText()}`)
    }

    if (responseJSON.processInstanceKey) {
      return responseJSON.processInstanceKey
    } else {
      throw new Error("Response missing processInstanceKey field")
    }
  } catch (error) {
    console.error(`[startProcessInstance] Error:`, error)
    throw new Error(`Failed to get processInstanceKey for ${processDefinitionId}: ${error}`)
  }
}

/**
 * Fetch the number of process instances for a given process definition ID.
 * @param processDefinitionId ID if process
 * @returns count of process instances
 */
async function fetchProcessInstances(
  processDefinitionId: string
): Promise<{ page: { totalItems: number }; items: { processInstanceKey: string; state: string }[] }> {
  const response = await fetch(`${camundaRest}/v2/process-instances/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      filter: {
        processDefinitionId: processDefinitionId
      },
      sort: [{ field: "startDate", order: "DESC" }]
    })
  })
  const data = await response.json()
  return data
}

/**
 * fetch information about a process instance by its id
 *
 * @param processInstanceId camunda id of process
 * @returns @see https://docs.camunda.io/docs/apis-tools/orchestration-cluster-api-rest/specifications/get-process-instance/
 */
async function fetchProcessInstanceById(
  processInstanceId: string
): Promise<{ processInstanceKey: string; state: string }> {
  const response = await fetch(`${camundaRest}/v2/process-instances/${processInstanceId}`, {
    method: "GET"
  })
  return await response.json()
}

/**
 * Get process instance key of camunda
 *
 * It tries to extract the process instance key from window.testing object in the browser.
 * This is custom behavior of the fiori app to expose testing information in that object.
 *
 * @param page page object of playwright
 * @returns
 */
async function getProcessInstanceKey(page: any) {
  let processInstanceKey: string
  await expect
    .poll(
      async () => {
        const testing = (await page.evaluate(() => (window as any).testing)) || {}
        processInstanceKey = testing.processInstanceKey
        return testing.processInstanceKey
      },
      {
        timeout: 5000,
        message: "Waiting for processInstanceKey to be set in window.testing"
      }
    )
    .not.toBeUndefined()
  return processInstanceKey
}

/**
 * Wait until the process instance reaches the COMPLETED state
 * @param processInstanceKey key of process instance
 */
async function waitForProcessCompletion(processInstanceKey: string) {
  await expect
    .poll(
      async () => {
        const instance = await fetchProcessInstanceById(processInstanceKey)
        return instance.state
      },
      {
        message: `Process should be COMPLETED`,
        timeout: 10000 // timeout after 10 sec
      }
    )
    .toBe("COMPLETED")
}

export {
  fetchVariableFromProcessInstance,
  pollVariableFromProcessInstance,
  fetchProcessInstanceById,
  fetchProcessInstances,
  waitForProcessCompletion,
  startProcessInstance
}
