import _ui5Service from "wdio-ui5-service"
const ui5Service = new _ui5Service()

import CheckBox from "sap/m/CheckBox"
import Input from "sap/m/Input"
import Button from "sap/ui/webc/main/Button"
import { formTarget, mockIndex } from "./po/commons"
import { buttonSelector, checkboxSelector, numberSelector, textFieldSelector } from "./po/validation-selectors"

describe("validation - some fields required", () => {
  before(async () => {
    await browser.goTo(mockIndex())
    await ui5Service.injectUI5()
    await formTarget("validation-mixed")
  })

  it("button is disabled b/c form is invalid", async () => {
    const button = await browser.asControl<Button>(buttonSelector)
    expect(await button.getEnabled()).toBe(false)
  })

  it("inputs all fields -> form is valid -> button is enabled", async () => {
    const textField = await browser.asControl<Input>(textFieldSelector)
    await textField.enterText("text")
    const number = await browser.asControl<Input>(numberSelector)
    await number.enterText("123")
    const checkbox = await browser.asControl<CheckBox>(checkboxSelector)
    await checkbox.press()
    const button = await browser.asControl<Button>(buttonSelector)
    expect(await button.getEnabled()).toBe(true)
  })
})
