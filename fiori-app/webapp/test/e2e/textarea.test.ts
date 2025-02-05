import _ui5Service from "wdio-ui5-service"
const ui5Service = new _ui5Service()

import { ns, mockIndex, formTarget } from "./po/commons"
import TextArea from "sap/m/TextArea"

describe("textarea", () => {
  before(async () => {
    await browser.goTo(mockIndex())
    await ui5Service.injectUI5()
    await formTarget("textarea-8.6")
    await browser.screenshot("before-textarea")
  })

  beforeEach(async () => {
    await browser.screenshot("before-each-textarea")
  })

  it("basic rendering", async () => {
    const textareaSelector = {
      selector: {
        id: /.*textarea_regular$/,
        controlType: "sap.m.TextArea",
        viewName: `${ns}.view.App`
      }
    }

    const ta = await browser.asControl<TextArea>(textareaSelector)
    const _name = await ta.getMetadata()
    const name = await _name.getElementName()
    expect(name).toBe("sap.m.TextArea")

    const labels = await ta.getLabels()
    expect(labels.length).toBe(1)
    expect(await labels[0].getText()).toBe("Text area regular")
  })

  it("default value", async () => {
    const textAreaControl = await browser.asControl<TextArea>({
      selector: {
        id: /.*textarea_default_value$/,
        controlType: "sap.m.TextArea",
        viewName: `${ns}.view.App`
      }
    })
    const value = await textAreaControl.getValue()
    expect(value).toBe("hello world")
  })

  it("validate 'disabled' state", async () => {
    const textAreaControl = await browser.asControl<TextArea>({
      selector: {
        id: /.*textarea_disabled$/,
        controlType: "sap.m.TextArea",
        viewName: `${ns}.view.App`
      }
    })
    const isEnabled = await textAreaControl.getEnabled()
    expect(isEnabled).toBe(false)
  })
  
  it("checks static read-only text area is not editable", async () => {
    const readOnlyTextArea = await browser.asControl<TextArea>({
      selector: {
        id: /.*textarea_read_only$/,
        controlType: "sap.m.TextArea",
       viewName: `${ns}.view.App`
      }
    })
    expect(await readOnlyTextArea.getEditable()).toBe(false)
  })

  it("checks feel-assigned read-only text area is not editable", async () => {
    const readOnlyTextArea = await browser.asControl<TextArea>({
      selector: {
        id: /.*textarea_read_only_feel$/,
        controlType: "sap.m.TextArea",
       viewName: `${ns}.view.App`
      }
    })
    expect(await readOnlyTextArea.getEditable()).toBe(false)
  })
  
  it("checks required text area", async () => {
    const textAreaControl = await browser.asControl<TextArea>({
      selector: {
        id: /.*textarea_required$/,
        controlType: "sap.m.TextArea",
        viewName: `${ns}.view.App`
      }
    })
    expect(await textAreaControl.getRequired()).toBe(true)
  })
})
