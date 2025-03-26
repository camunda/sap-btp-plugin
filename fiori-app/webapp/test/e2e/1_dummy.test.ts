import _ui5Service, { wdi5 } from "wdio-ui5-service"
const ui5Service = new _ui5Service()

import { ns, mockIndex, formTarget } from "./po/commons"

describe("dummy", () => {
  before(async () => {
    await browser.goTo(mockIndex())
    await ui5Service.injectUI5()
    await formTarget("checkbox-8.6")
    const pause = process.env.ci ? 6000 : 1000
    wdi5.getLogger().info(`>>>>>>>>>> pausing for ${pause} ms to let ui5-tooling-modules do its work...`)
    await browser.pause(pause)
    wdi5.getLogger().info(">>>>>>>>>> ...done pausing - let's do this!")
    await browser.screenshot("before-dummy")
  })

  // beforeEach(async () => {
  //   await browser.screenshot("before-each-dummy")
  // })

  // afterEach(async () => {

  //   await browser.screenshot("after-each-dummy")
  // })

  it("foo", async () => {
    expect(true).toBeTruthy()
  })
})
