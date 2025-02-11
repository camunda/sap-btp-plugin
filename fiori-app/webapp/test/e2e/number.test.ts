import _ui5Service from "wdio-ui5-service"
const ui5Service = new _ui5Service()

import { ns, mockIndex, formTarget } from "./po/commons"
import Input from "sap/m/Input"

describe("number input", () => {
  before(async () => {
    await browser.goTo(mockIndex())
    await ui5Service.injectUI5()
    await formTarget("number-8.6")
    await browser.screenshot("before-number-input")
  })

  beforeEach(async () => {
    await browser.screenshot("before-each-number-input")
  })

  it("basic rendering", async () => {
    const numberInputSelector = {
      selector: {
        id: /.*number_regular$/,
        controlType: "sap.m.Input",
        viewName: `${ns}.view.App`
      }
    }

    const numberInput = await browser.asControl<Input>(numberInputSelector)
    const _name = await numberInput.getMetadata()
    const name = await _name.getElementName()
    expect(name).toBe("sap.m.Input")

    const labels = await numberInput.getLabels()
    expect(labels.length).toBe(1)
    expect(await labels[0].getText()).toBe("Number regular")
  })

  it("default value", async () => {
    const numberInputControl = await browser.asControl<Input>({
      selector: {
        id: /.*number_default_value$/,
        controlType: "sap.m.Input",
        viewName: `${ns}.view.App`
      }
    })
    const value = await numberInputControl.getValue()
    expect(value).toBe("42")
  })

  it("validate decimal digits", async () => {
    const numberInputControl = await browser.asControl<Input>({
      selector: {
        id: /.*number_decimal_digits$/,
        controlType: "sap.m.Input",
        viewName: `${ns}.view.App`
      }
    })

    // 5 decimal digits
    await numberInputControl.enterText("123.12345")
    let valueState = await numberInputControl.getValueState()
    expect(valueState).toBe("Error")

    // 4 decimal digits
    await numberInputControl.enterText("123.1234")
    valueState = await numberInputControl.getValueState()
    expect(valueState).toBe("None")

    // 3 decimal digits
    await numberInputControl.enterText("123.123")
    valueState = await numberInputControl.getValueState()
    expect(valueState).toBe("None")

    await numberInputControl.enterText("456")
    valueState = await numberInputControl.getValueState()
    expect(valueState).toBe("None")
  })

  it("validate 'disabled' state", async () => {
    const numberInputControl = await browser.asControl<Input>({
      selector: {
        id: /.*number_disabled$/,
        controlType: "sap.m.Input",
        viewName: `${ns}.view.App`
      }
    })
    const isEnabled = await numberInputControl.getEnabled()
    expect(isEnabled).toBe(false)
  })

  it("checks static read-only number input is not editable", async () => {
    const readOnlyNumberInput = await browser.asControl<Input>({
      selector: {
        id: /.*number_read_only_static$/,
        controlType: "sap.m.Input",
        viewName: `${ns}.view.App`
      }
    })
    expect(await readOnlyNumberInput.getEditable()).toBe(false)
  })

  it("checks feel-assigned read-only number input is not editable", async () => {
    const readOnlyNumberInput = await browser.asControl<Input>({
      selector: {
        id: /.*number_read_only_feel$/,
        controlType: "sap.m.Input",
        viewName: `${ns}.view.App`
      }
    })
    expect(await readOnlyNumberInput.getEditable()).toBe(false)
  })

  it("checks required number input", async () => {
    const numberInputControl = await browser.asControl<Input>({
      selector: {
        id: /.*number_required$/,
        controlType: "sap.m.Input",
        viewName: `${ns}.view.App`
      }
    })
    expect(await numberInputControl.getRequired()).toBe(true)
  })

  it("validate prefix label", async () => {
    const numberInputControl = await browser.asControl<Input>({
      selector: {
        id: /.*number_prefix$/,
        controlType: "sap.m.Input",
        viewName: `${ns}.view.App`
      }
    })

    const labels = await numberInputControl.getLabels()
    const labelTexts = await Promise.all(labels.map(label => label.getText()))
    expect(labelTexts).toContain("aloha")
  })

  it("validate postfix label", async () => {
    const numberInputControl = await browser.asControl<Input>({
      selector: {
        id: /.*number_suffix$/,
        controlType: "sap.m.Input",
        viewName: `${ns}.view.App`
      }
    })

    const postfix = await numberInputControl.getDescription()
    expect(postfix).toBe("Dollares")
  })

  it("validate both prefix and postfix labels", async () => {
    const numberInputControl = await browser.asControl<Input>({
      selector: {
        id: /.*number_prefix_suffix_feel$/,
        controlType: "sap.m.Input",
        viewName: `${ns}.view.App`
      }
    })

    await numberInputControl.enterText("42")

    const labels = await numberInputControl.getLabels()
    const labelTexts = await Promise.all(labels.map(label => label.getText()))
    expect(labelTexts).toContain("say")

    const postfix = await numberInputControl.getDescription()
    expect(postfix).toBe("one more time")
  })

  
})
