import test, { expect } from "@playwright/test"

const camundaRest = (globalThis as any).process?.env?.ZEEBE_REST_ADDRESS ?? "http://localhost:8088"

/**
 * fetch variable from camunda backend by calling process instance variable endpoint
 *
 * @param processInstanceKey key of running (must) process instance
 * @param variableName variable name to fetch
 * @returns variable value
 */
async function fetchVariableFromProcessInstanceAPI(processInstanceKey: string, variableName: string): Promise<any> {
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
 * It forces to wait until variable is set in process instance and extracts process instance key from window.testing if not given
 *
 * Whereas fetchVariableFromProcessInstance tries only once to get the variable, this function will poll until the variable is set.
 *
 * @param variableName variable to fetch from browser session
 * @param page optional page object of playwright. only needed, if no process instance key is given
 * @param processInstanceKey optional process instance identifier. If not given, we try to extract that from server
 * @returns
 */
async function fetchForceVariableFromProcessInstance(
  variableName: string,
  processInstanceKey: string = "",
  page: any = {}
): Promise<any> {
  return new Promise(async (resolve, reject) => {
    let variable: string
    if (processInstanceKey === "") {
      if (!page) {
        reject("No page object given to extract processInstanceKey from window.testing")
        return
      }
      processInstanceKey = await getProcessInstanceKey(page)
    }

    await expect
      .poll(
        async () => {
          variable = (await fetchVariableFromProcessInstanceAPI(processInstanceKey, variableName)) as string
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
        console.log("Process Instance Key from window.testing:", processInstanceKey)
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

export {
  fetchVariableFromProcessInstanceAPI,
  fetchForceVariableFromProcessInstance,
  getProcessInstanceKey,
  fetchProcessInstanceById,
  fetchProcessInstances
}
