import _ui5Service from "wdio-ui5-service"
const ui5Service = new _ui5Service()

import { ns, mockIndex, formTarget } from "./po/commons"

describe("checkbox", () => {
  before(async () => {
    await browser.goTo(mockIndex())
    await ui5Service.injectUI5()
    await formTarget("checkbox-8.6")
    await browser.screenshot("before-checkbox-group")
  })

  beforeEach(async () => {
    await browser.screenshot("before-each-checkbox-group")
  })

  it("basic select/deselect", async () => {
    const checkboxSelector = {
      selector: {
        id: /.*checkbox_regular$/,
        controlType: "sap.m.CheckBox",
        viewName: `${ns}.view.App`
      }
    }

    const checkbox = await browser.asControl(checkboxSelector)

    const before = await checkbox.getProperty("selected")
    expect(before).toBeFalsy()

    await checkbox.press()
    const after = await checkbox.getProperty("selected")
    expect(after).toBeTruthy()
  })

  it("pre-checked", async () => {
    const checkboxSelector = {
      selector: {
        id: /.*checkbox_default_checked$/,
        controlType: "sap.m.CheckBox",
        viewName: `${ns}.view.App`
      }
    }

    const checkbox = await browser.asControl(checkboxSelector)
    const checked = await checkbox.getProperty("selected")
    expect(checked).toBeTruthy()
  })

  it("disabled", async () => {
    const checkboxSelector = {
      selector: {
        id: /.*checkbox_7jyrfq$/,
        controlType: "sap.m.CheckBox",
        viewName: `${ns}.view.App`
      }
    }

    const checkbox = await browser.asControl(checkboxSelector)
    const disabled = await checkbox.getProperty("enabled")
    expect(disabled).toBeFalsy()
  })

  it("read-only state of", async () => {
    const checkboxSelector = {
      selector: {
        id: /.*checkbox_ro_static$/,
        controlType: "sap.m.CheckBox",
        viewName: `${ns}.view.App`
      }
    }

    const checkbox = await browser.asControl(checkboxSelector)
    const readOnly = await checkbox.getProperty("editable")
    expect(readOnly).toBeFalsy()
  })

  it.skip("read-only state of via feel", async () => {})
  it.skip("value state: mandatory", async () => {})
})
