import _ui5Service from "wdio-ui5-service"
const ui5Service = new _ui5Service()

import { ns, mockIndex, formTarget } from "./po/commons"

describe("dummy", () => {
  before(async () => {
    await browser.goTo(mockIndex())
    await ui5Service.injectUI5()
    await formTarget("checkbox-8.6")
    await browser.screenshot("before-dummy")
  })

  beforeEach(async () => {
    await browser.screenshot("before-each-dummy")
  })

  it("basic select/deselect", async () => {
    expect(true).toBeTruthy()
  })
})
