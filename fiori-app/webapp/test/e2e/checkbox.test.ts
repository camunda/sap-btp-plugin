import _ui5Service from "wdio-ui5-service"
const ui5Service = new _ui5Service()

import { ns, navTarget } from "./po/commons"

describe("checkbox", () => {
  before(async () => {
    await browser.goTo(navTarget("checkbox-8.6"))
    await ui5Service.injectUI5()
    await browser.screenshot("before-checkbox-group")
  })

  beforeEach(async () => {
    await browser.screenshot("before-each-checkbox-group")
  })

  it("basic select/deselect", async () => {
    const checkboxSelector = {
      selector: {
        id: /.*checkbox_regular$/,
        controlType: "@ui5/webcomponents.CheckBox",
        viewName: `${ns}.view.App`
      }
    }

    const checkbox = await browser.asControl(checkboxSelector)

    // @ts-expect-error
    const before = await checkbox.getChecked()
    expect(before).toBeFalsy()

    await checkbox.press()
    // @ts-expect-error
    const after = await checkbox.getChecked()
    expect(after).toBeTruthy()
  })

  it("pre-checked", async () => {
    const checkboxSelector = {
      selector: {
        id: /.*checkbox_default_checked$/,
        controlType: "@ui5/webcomponents.CheckBox",
        viewName: `${ns}.view.App`
      }
    }

    const checkbox = await browser.asControl(checkboxSelector)
    // @ts-expect-error
    const checked = await checkbox.getChecked()
    expect(checked).toBeTruthy()
  })

  it("disabled", async () => {
    const checkboxSelector = {
      selector: {
        id: /.*checkbox_7jyrfq$/,
        controlType: "@ui5/webcomponents.CheckBox",
        viewName: `${ns}.view.App`
      }
    }

    const checkbox = await browser.asControl(checkboxSelector)
    // @ts-expect-error
    const disabled = await checkbox.getEnabled()
    expect(disabled).toBeFalsy()
  })

  it("read-only state of", async () => {
    const checkboxSelector = {
      selector: {
        id: /.*checkbox_ro_static$/,
        controlType: "@ui5/webcomponents.CheckBox",
        viewName: `${ns}.view.App`
      }
    }

    const checkbox = await browser.asControl(checkboxSelector)
    // @ts-expect-error
    const readOnly = await checkbox.getReadonly()
    expect(readOnly).toBeTruthy()
  })

  it.skip("read-only state of via feel", async () => {})
  it.skip("value state: mandatory", async () => {})
})
