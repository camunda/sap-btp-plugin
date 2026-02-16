import test, { expect, Page } from "@playwright/test"

const camundaRest = (globalThis as any).process?.env?.CAMUNDA_REST_ADDRESS ?? "http://localhost:8080/"

async function getTopology() {
  const token = await getCamundaAccessToken()
  const response = await fetch(`${camundaRest}v1/topology`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    }
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get topology: ${response.status} ${response.statusText} - ${error}`)
  }

  return await response.json()
}

/**
 * fetch variable from camunda backend by calling process instance variable endpoint
 *
 * @param processInstanceKey key of running (must) process instance
 * @param variableName variable name to fetch
 * @returns variable value
 */
async function fetchVariableFromProcessInstance(processInstanceKey: string, variableName: string): Promise<any> {
  const token = await getCamundaAccessToken()
  const response = await fetch(`${camundaRest}v1/variables/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
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
  let currentUrl = page.url()

  // If we're on about:blank or empty, use the baseURL from config
  if (currentUrl === "about:blank" || currentUrl === "" || !currentUrl.includes("localhost")) {
    const baseURL = (page.context() as any)._options?.baseURL || "http://localhost:5001/app/index.html"
    currentUrl = baseURL
  }

  const url = new URL(currentUrl)
  // url.searchParams.set("channelId", processDefinitionId)
  url.searchParams.set("run", processDefinitionId)
  url.searchParams.set("channelId", processDefinitionId)
  const targetUrl = url.toString()

  // Set up waitForResponse BEFORE navigation
  const responsePromise = page.waitForResponse(
    (response) => {
      return response.url().includes("runProcess")
    },
    { timeout: 30000 }
  )

  // Navigate after response listener is set up
  await page.goto(targetUrl, { waitUntil: "domcontentloaded" })

  // Wait for the response
  try {
    const response = await responsePromise

    console.log(
      `[startProcessInstance ${processDefinitionId}] runProcess: ${await response.status()} ${await response.statusText()} and ${await response.text()}... `
    )
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
  const token = await getCamundaAccessToken()
  const response = await fetch(`${camundaRest}v1/process-instances/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
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
  const token = await getCamundaAccessToken()
  const url = `${camundaRest}v1/process-instances/${processInstanceId}`
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
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

/**
 * Get an OAuth2 access token from Keycloak using Client Credentials Flow
 * Uses environment variables: CAMUNDA_CLIENT_ID, CAMUNDA_CLIENT_SECRET, CAMUNDA_OAUTH_URL
 *
 * @returns access token
 */
async function getCamundaAccessToken(): Promise<string> {
  const clientId = (globalThis as any).process?.env?.CAMUNDA_CLIENT_ID ?? "zeebe"
  const clientSecret = (globalThis as any).process?.env?.CAMUNDA_CLIENT_SECRET ?? "zecret"
  const oauthUrl =
    (globalThis as any).process?.env?.CAMUNDA_OAUTH_URL ??
    "http://localhost:18080/auth/realms/camunda-platform/protocol/openid-connect/token"

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret
  }).toString()

  const response = await fetch(oauthUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get access token: ${response.status} ${response.statusText} - ${error}`)
  }

  const data = await response.json()
  if (!data.access_token) {
    throw new Error("No access token in response")
  }

  return data.access_token
}

export {
  fetchVariableFromProcessInstance,
  pollVariableFromProcessInstance,
  fetchProcessInstanceById,
  fetchProcessInstances,
  waitForProcessCompletion,
  startProcessInstance,
  getTopology,
  getCamundaAccessToken
}
