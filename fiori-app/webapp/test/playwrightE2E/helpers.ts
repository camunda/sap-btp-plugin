import test, { expect, Page } from "@playwright/test"

const camundaRest = (globalThis as any).process?.env?.ZEEBE_REST_ADDRESS ?? "http://localhost:8088"

/**
 * fetch variable from camunda backend by calling process instance variable endpoint
 *
 * @param processInstanceKey key of running (must) process instance
 * @param variableName variable name to fetch
 * @returns variable value
 */
async function fetchVariableFromProcessInstance(processInstanceKey: string, variableName: string): Promise<any> {
  return new Promise((resolve, reject) => {
    fetch(`${camundaRest}/v2/variables/search`, {
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
      .then((response) => response.json())
      .then((data) => {
        resolve(data.items[0]?.value)
      })
      .catch((error) => {
        reject(error)
      })
  })
}

/**
 * Get variable from camunda backend by calling process instance variable endpoint
 *
 * @param variableName variable to fetch from browser session
 * @param processInstanceKey process instance identifier
 * @returns
 */
async function pollVariableFromProcessInstance(variableName: string, processInstanceKey: string): Promise<any> {
  return new Promise(async (resolve, reject) => {
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
    resolve(variable)
  })
}

/**
 * Start a new process instance by navigating to the fiori app with ?run=processDefinitionId
 *
 * @param processDefinitionId camunda process definition used in Camunda GUI
 * @param page page object of playwright
 * @returns process instance key of started process
 */
async function startProcessInstance(processDefinitionId: string, page: Page): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const runProcessPromise = page.waitForResponse((response) => {
      return response.url().endsWith("runProcess") && response.status() === 200
    })

    await page.goto("?run=" + processDefinitionId)

    const response = await runProcessPromise

    if (response.ok()) {
      const body = await response.json()
      resolve(body.processInstanceKey)
    } else {
      reject(`Failed to start process instance for ${processDefinitionId}`)
    }
  })
}

/**
 * Fetch the number of process instances for a given process definition ID.
 * @param processDefinitionId ID if process
 * @returns count of process instances
 */
async function fetchProcessInstances(
  processDefinitionId: string
): Promise<{ page: { totalItems: number }; items: { processInstanceKey: string; state: string }[] }> {
  return new Promise((resolve, reject) => {
    fetch(`${camundaRest}/v2/process-instances/search`, {
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
      .then((response) => response.json())
      .then((data) => {
        resolve(data) // count of instances
      })
      .catch((error) => {
        reject(error)
      })
  })
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
  return new Promise((resolve, reject) => {
    fetch(`${camundaRest}/v2/process-instances/${processInstanceId}`, {
      method: "GET"
    })
      .then((response) => response.json())
      .then((data) => {
        resolve(data) // count of instances
      })
      .catch((error) => {
        reject(error)
      })
  })
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
