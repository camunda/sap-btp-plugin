import JSONModel from "sap/ui/model/json/JSONModel"

export const ns = "io.camunda.connector.sap.btp.app"

export function mockIndex(/* formElement: string */) {
  // return `/mockserver.html?channelId=${(Math.random() + 1).toString(36).substring(2)}&mock=${formElement}`
  return `/mockserver.html?channelId=${(Math.random() + 1).toString(36).substring(2)}`
}

export async function formTarget(formElement: string) {
  const pause = process.env.CI ? 3000 : 500
  await browser.pause(pause) //> ugh, yes
  return await browser.executeAsync((formElement: String, done: Function) => {
    const interval = window.setInterval(() => {
      // @ts-expect-error
      if (window.webSocketMockServer) {
        window.clearInterval(interval)
        // @ts-expect-error
        window.webSocketMockServer.runForm(formElement).then(() => done())
      }
    }, 100)
  }, formElement)
}

export async function injectFEEL(formId: string, feelVariables: Array<{name: string, value: any}>) {
  await browser.executeAsync((feelVariables: Array<{name: string, value: any}>, done: Function) => {
    const bpmnForm = sap.ui.getCore().byId("__xmlview0--BPMNform") //> gnarf
    // @ts-expect-error this is dirrrty stuff - don't do it at home, kids
    const models = bpmnForm._getPropertiesToPropagate().oModels

    for (const [modelName, _] of Object.entries(models)) {
      if (modelName.startsWith("id-")) {
        const model = bpmnForm.getModel(modelName) as JSONModel;
        
        // Set each variable from the feelVariables array
        for (const variable of feelVariables) {
          model.setProperty(
            `/BPMNform/variables/${variable.name}`,
            variable.value
          );
        }
      }
    }

    // @ts-expect-error
    bpmnForm.reset()
    // @ts-expect-error
    bpmnForm.processForm(window._data) //> storing the ws data on window is done in webSocketMockServer.ts

    done()
  }, feelVariables)
}