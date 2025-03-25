import _ui5Service from "wdio-ui5-service"
const ui5Service = new _ui5Service()

import { ns, mockIndex, formTarget, injectFEEL } from "./po/commons"
import Input from "sap/m/Input"

describe("textfield input", () => {
  before(async () => {
    await browser.goTo(mockIndex())
    await ui5Service.injectUI5()
    await formTarget("textfield-8.6")
    await browser.screenshot("before-textfield-input")
  })

  beforeEach(async () => {
    await browser.screenshot("before-each-textfield-input")
  })

  it("basic rendering", async () => {
    const textfieldInputSelector = {
      selector: {
        id: /.*textfield_regular$/,
        controlType: "sap.m.Input",
        viewName: `${ns}.view.App`
      }
    }

    const textfieldInput = await browser.asControl<Input>(textfieldInputSelector)
    const _name = await textfieldInput.getMetadata()
    const name = await _name.getElementName()
    expect(name).toBe("sap.m.Input")

    const labels = await textfieldInput.getLabels()
    expect(labels.length).toBe(1)
    expect(await labels[0].getText()).toBe("Text field regular")
  })

  it("default value", async () => {
    const textfieldInputControl = await browser.asControl<Input>({
      selector: {
        id: /.*textfield_default_value$/,
        controlType: "sap.m.Input",
        viewName: `${ns}.view.App`
      }
    })
    const value = await textfieldInputControl.getValue()
    expect(value).toBe("hello world!")
  })

  it("validate 'disabled' state", async () => {
    const textfieldInputControl = await browser.asControl<Input>({
      selector: {
        id: /.*textfield_disabled$/,
        controlType: "sap.m.Input",
        viewName: `${ns}.view.App`
      }
    })
    const isEnabled = await textfieldInputControl.getEnabled()
    expect(isEnabled).toBe(false)
  })

  it("checks static read-only textfield input is not editable", async () => {
    const readOnlyTextfieldInput = await browser.asControl<Input>({
      selector: {
        id: /.*textfield_read_only_static$/,
        controlType: "sap.m.Input",
        viewName: `${ns}.view.App`
      }
    })
    expect(await readOnlyTextfieldInput.getEditable()).toBe(false)
  })

  it("checks feel-assigned read-only textfield input is not editable", async () => {
    const readOnlyTextfieldInput = await browser.asControl<Input>({
      selector: {
        id: /.*textfield_read_only_feel$/,
        controlType: "sap.m.Input",
        viewName: `${ns}.view.App`
      }
    })
    expect(await readOnlyTextfieldInput.getEditable()).toBe(false)
  })

  it("validate prefix and suffix label", async () => {
    const textfieldInputControl = await browser.asControl<Input>({
      selector: {
        id: /.*textfield_prefix_suffix$/,
        controlType: "sap.m.Input",
        viewName: `${ns}.view.App`
      }
    })

    const labels = await textfieldInputControl.getLabels()
    const labelTexts = await Promise.all(labels.map((label) => label.getText()))
    expect(labelTexts).toContain("before")
    const postfix = await textfieldInputControl.getDescription()
    expect(postfix).toBe("after")
  })

  it("checks required textfield input", async () => {
    const textfieldInputControl = await browser.asControl<Input>({
      selector: {
        id: /.*textfield_required$/,
        controlType: "sap.m.Input",
        viewName: `${ns}.view.App`
      }
    })
    expect(await textfieldInputControl.getRequired()).toBe(true)
  })

  it("validate email input", async () => {
    const emailInputControl = await browser.asControl<Input>({
      selector: {
        id: /.*textfield_validation_email$/,
        controlType: "sap.m.Input",
        viewName: `${ns}.view.App`
      }
    })

    await emailInputControl.enterText("invalid-email")
    let valueState = await emailInputControl.getValueState()
    expect(valueState).toBe("Error")

    await emailInputControl.enterText(".valid+email@example.com")
    valueState = await emailInputControl.getValueState()
    expect(valueState).toBe("None")

    await emailInputControl.enterText("valid-email_addy@example.com")
    valueState = await emailInputControl.getValueState()
    expect(valueState).toBe("None")
  })

  it("validate international phone numbers", async () => {
    const phoneInputControl = await browser.asControl<Input>({
      selector: {
        id: /.*textfield_validation_phone$/,
        controlType: "sap.m.Input",
        viewName: `${ns}.view.App`
      }
    })

    const invalidPhones = ["invalid-phone", "phone+abc"]
    for (const phone of invalidPhones) {
      await phoneInputControl.enterText(phone)
      const valueState = await phoneInputControl.getValueState()
      expect(valueState).toBe("Error")
    }

    const validPhones = [
      "+1 123-456-7890",
      "+44 20 1234 5678",
      "0049 8963648018",
      "0151555888",
      "0151-211-011-4786",
      "+49-151-211-011-4786"
    ]
    for (const phone of validPhones) {
      await phoneInputControl.enterText(phone)
      const valueState = await phoneInputControl.getValueState()
      expect(valueState).toBe("None")
    }
  })

  it("validate min and max character input", async () => {
    const minMaxInputControl = await browser.asControl<Input>({
      selector: {
        id: /.*textfield_validation_min_max$/,
        controlType: "sap.m.Input",
        viewName: `${ns}.view.App`
      }
    })

    const testCases = [
      { value: "ab", expected: "Error" },
      { value: "abc", expected: "None" },
      { value: "abcd", expected: "None" },
      { value: "abcde", expected: "None" },
      { value: "abcdef", expected: "Error" }
    ]

    for (const { value, expected } of testCases) {
      await minMaxInputControl.enterText(value)
      const valueState = await minMaxInputControl.getValueState()
      expect(valueState).toBe(expected)
    }
  })

  it("validate custom lower-case input", async () => {
    const customInputControl = await browser.asControl<Input>({
      selector: {
        id: /.*textfield_validation_custom$/,
        controlType: "sap.m.Input",
        viewName: `${ns}.view.App`
      }
    })

    // the regex is configured in the form element itself
    await customInputControl.enterText("lowercaseinput")
    let valueState = await customInputControl.getValueState()
    expect(valueState).toBe("None")

    await customInputControl.enterText("InvalidInput")
    valueState = await customInputControl.getValueState()
    expect(valueState).toBe("Error")
  })

  it("should hide a textfield input when the visibility is set to false", async () => {
    const textField = {
      selector: {
        id: /.*textfield_visibility$/,
        controlType: "sap.m.Input",
        viewName: `${ns}.view.App`
      },
      forceSelect: true
    }

    const textfieldInputControl = await browser.asControl<Input>(textField)
    let visible = await textfieldInputControl.getVisible()
    expect(visible).toBeTruthy()

    const feelVars = [{ name: "invisible", value: true }]
    await injectFEEL("__xmlview0--BPMNform", feelVars)
    const textFieldAfter = await browser.asControl<Input>(textField)
    visible = await textFieldAfter.isInitialized()
    expect(visible).toBeFalsy()
  })
})
