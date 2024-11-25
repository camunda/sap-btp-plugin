import _ui5Service from "wdio-ui5-service"
const ui5Service = new _ui5Service()

import { ns, navTarget } from "./po/commons"

describe("samples", () => {
  before(async () => {
    await browser.goTo(navTarget("checkbox-8.6"))
    await ui5Service.injectUI5()
  })

  it("should validate basic select/deselect", async () => {
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

  it("should validate pre-checked checkbox", async () => {
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

  it("should validate disabled checkbox", async () => {
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

  it("should validate read-only state of checkbox", async () => {
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

  it.skip("should validate read-only state of checkbox via feel", async () => {})
})
