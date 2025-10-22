import { ZeebeGrpcClient } from "@camunda8/sdk"
import { test, expect } from "@playwright/test"
import { CamundaRequest } from "../../util/CamundaData"

const camundaRest = (globalThis as any).process?.env?.ZEEBE_REST_ADDRESS ?? "http://localhost:8088"

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
 * get variable from camunda backend by calling process instance variable endpoint
 *
 * @param variableName variable to fetch from browser session
 * @param page optional page object of playwright. only needed, if no process instance key is given
 * @param processInstanceKey optional process instance identifier. If not given, we try to extract that from server
 * @returns
 */
async function getVariableFromProcessInstance(
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

test.describe("RadioGroup Control E2E Test", () => {
  test.only("should retrieve variable from UI5 and verify API call", async ({ page }) => {
    let switchVariable: string
    const processDefinitionId = "process_45_radiogroup"
    await page.goto("?run=" + processDefinitionId)
    await page.getByRole("button", { name: "Next" }).click()
    switchVariable = (await getVariableFromProcessInstance("switch", "", page)) as string
    console.log("Fetched switch variable:", switchVariable)
  })
})
