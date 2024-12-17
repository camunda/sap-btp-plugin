import _ui5Service from "wdio-ui5-service"
const ui5Service = new _ui5Service()

import { ns, mockIndex, formTarget } from "./po/commons"
import RadioButtonGroup from "sap/m/RadioButtonGroup"
import RadioButton from "sap/m/RadioButton"

describe("radio button + -group", () => {
  before(async () => {
    await browser.goTo(mockIndex())
    await ui5Service.injectUI5()
    await formTarget("radio-8.6")
    await browser.screenshot("before-radio-button-group")
  })

  beforeEach(async () => {
    await browser.screenshot("before-each-radio-button-group")
  })

  it("basic select", async () => {
    const radioButtonGroupSelector = {
      selector: {
        id: /.*radio_static$/,
        controlType: "sap.m.RadioButtonGroup",
        viewName: `${ns}.view.App`
      }
    }

    // @ts-expect-error
    const radioButtons: RadioButton[] = await browser.asControl<RadioButtonGroup>(radioButtonGroupSelector).getButtons()
    const [first, second] = radioButtons
    const before1 = await first.getSelected()
    const before2 = await second.getSelected()
    expect(before1).toBeFalsy()
    expect(before2).toBeFalsy()

    await second.setSelected(true)
    const after1 = await first.getSelected()
    const after2 = await second.getSelected()
    expect(after1).toBeFalsy()
    expect(after2).toBeTruthy()
  })

  it("pre-selected radio button", async () => {
    const radioButtonGroupSelector = {
      selector: {
        id: /.*radio_static_default$/,
        controlType: "sap.m.RadioButtonGroup",
        viewName: `${ns}.view.App`
      }
    }

    // @ts-expect-error
    const radioButtons: RadioButton[] = await browser.asControl<RadioButtonGroup>(radioButtonGroupSelector).getButtons()
    const [first, second, third] = radioButtons
    const checked = await second.getSelected()
    expect(checked).toBeTruthy()
  })

  it("disabled radio button group", async () => {
    const radioButtonGroupSelector = {
      selector: {
        id: /.*radio_disabled$/,
        controlType: "sap.m.RadioButtonGroup",
        viewName: `${ns}.view.App`
      }
    }

    const group = await browser.asControl<RadioButtonGroup>(radioButtonGroupSelector)
    const enabled = await group.getEnabled()
    expect(enabled).toBeFalsy()
  })

  it("read-only state of radio button group", async () => {
    const radioButtonGroupSelector = {
      selector: {
        id: /.*radio_ro$/,
        controlType: "sap.m.RadioButtonGroup",
        viewName: `${ns}.view.App`
      }
    }

    const group = await browser.asControl<RadioButtonGroup>(radioButtonGroupSelector)
    const editable = await group.getEditable()
    expect(editable).toBeFalsy()
  })

  it.skip("dynamic generation of radio button group (input data)", async () => {})
  it.skip("dynamic generation of radio button group (expression)", async () => {})
  it.skip("value state: mandatory", async () => {})
})
