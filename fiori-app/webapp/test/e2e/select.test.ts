import _ui5Service from "wdio-ui5-service"
const ui5Service = new _ui5Service()

import { ns, navTarget } from "./po/commons"
import Select from "sap/m/Select"
import Item from "sap/ui/core/Item"

describe("select", () => {
  before(async () => {
    await browser.goTo(navTarget("select-8.6"))
    await ui5Service.injectUI5()
    await browser.screenshot("before-select-group")
  })

  beforeEach(async () => {
    await browser.screenshot("before-each-select-group")
  })

  it("basic select", async () => {
    const selectSelector = {
      selector: {
        id: /.*select_static$/,
        controlType: "sap.m.Select",
        viewName: `${ns}.view.App`
      },
      interaction: "root"
    }

    const select = await browser.asControl<Select>(selectSelector)
    await select.open() // to get the items into the DOM
    const items: Item[] = await select.getItems()

    const value = await select.getSelectedItem()
    expect(value).toBeFalsy()

    const id = await items[1].getId()
    await select.setSelectedItem(id)
    const after = await select.getSelectedItem()
    expect(after).toBe(items[1])
  })

  it("pre-selected", async () => {
    const selectSelector = {
      selector: {
        id: /.*select_static_default_value$/,
        controlType: "sap.m.Select",
        viewName: `${ns}.view.App`
      },
      interaction: "root"
    }

    const select = await browser.asControl<Select>(selectSelector)
    await select.open() // to get the items into the DOM
    const item = await select.getSelectedItem()
    expect(await item.getText()).toBe("label default second")
  })

  it.skip("static disabled", async () => {})
  it.skip("static read-only", async () => {})
  it.skip("input data", async () => {})
  it.skip("expression", async () => {})
})
