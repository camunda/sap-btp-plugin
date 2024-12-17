export const ns = "io.camunda.connector.sap.btp.app"

export function mockIndex(/* formElement: string */) {
  // return `/mockserver.html?channelId=${(Math.random() + 1).toString(36).substring(2)}&mock=${formElement}`
  return `/mockserver.html?channelId=${(Math.random() + 1).toString(36).substring(2)}`
}

export async function formTarget(formElement: string) {
  await browser.pause(500) //> ugh, yes
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
