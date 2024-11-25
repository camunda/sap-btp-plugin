export const ns = "io.camunda.connector.sap.btp.app"

export function navTarget(formElement: string) {
  return `/mockserver.html?channelId=${(Math.random() + 1).toString(36).substring(2)}&mock=${formElement}`
}