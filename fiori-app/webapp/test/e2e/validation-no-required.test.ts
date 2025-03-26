import _ui5Service from "wdio-ui5-service"
const ui5Service = new _ui5Service()

import Button from "sap/ui/webc/main/Button"
import { formTarget, mockIndex } from "./po/commons"
import { buttonSelector } from "./po/validation-selectors"

describe("validation necessary - only non-req fields", () => {
  before(async () => {
    await browser.goTo(mockIndex())
    await ui5Service.injectUI5()
    await formTarget("validation-no-required")
  })

  it("button is enabled", async () => {
    const button = await browser.asControl<Button>(buttonSelector)
    expect(await button.getEnabled()).toBe(true)
  })
})
