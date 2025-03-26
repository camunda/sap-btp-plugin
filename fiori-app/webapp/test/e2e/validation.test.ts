import _ui5Service from "wdio-ui5-service"
const ui5Service = new _ui5Service()

import CheckBox from "sap/m/CheckBox"
import DatePicker from "sap/m/DatePicker"
import Input from "sap/m/Input"
import RadioButton from "sap/m/RadioButton"
import Select from "sap/m/Select"
import TextArea from "sap/m/TextArea"
import Button from "sap/ui/webc/main/Button"
import { formTarget, mockIndex } from "./po/commons"
import {
  buttonSelector,
  checkboxSelector,
  dateSelector,
  numberSelector,
  radioSelector,
  selectSelector,
  textAreaSelector,
  textFieldSelector
} from "./po/validation-selectors"

describe("validation", () => {
  before(async () => {
    await browser.goTo(mockIndex())
    await ui5Service.injectUI5()
    await formTarget("validation-mixed")
  })

  it("button is disabled b/c the required form elements are invalid", async () => {
    const button = await browser.asControl<Button>(buttonSelector)
    expect(await button.getEnabled()).toBe(false)
  })

  it("inputs all required fields -> form is valid -> button is enabled", async () => {
    const textField = await browser.asControl<Input>(textFieldSelector)
    await textField.enterText("text")
    const textArea = await browser.asControl<TextArea>(textAreaSelector)
    await textArea.enterText("text")
    const number = await browser.asControl<Input>(numberSelector)
    await number.enterText("123")
    const date = await browser.asControl<DatePicker>(dateSelector)
    await date.enterText("2021-01-01")
    const checkbox = await browser.asControl<CheckBox>(checkboxSelector)
    await checkbox.press()
    const radio = await browser.asControl<RadioButton>(radioSelector)
    await radio.press()
    const select = await browser.asControl<Select>(selectSelector)
    await select.open()
    const items = await select.getItems()
    // @ts-ignore
    await items[0].press()
    const button = await browser.asControl<Button>(buttonSelector)
    expect(await button.getEnabled()).toBe(true)
  })
})
