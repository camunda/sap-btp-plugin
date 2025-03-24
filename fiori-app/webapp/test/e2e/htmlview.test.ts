import _ui5Service from "wdio-ui5-service"
const ui5Service = new _ui5Service()

import { ns, mockIndex, formTarget } from "./po/commons"
import HTML from "sap/ui/core/HTML"
import JSONModel from "sap/ui/model/json/JSONModel"
import Core from "sap/ui/core/Core"

describe("HTML control", () => {
  before(async () => {
    await browser.goTo(mockIndex())
    await ui5Service.injectUI5()
    await formTarget("html-view")
    // await browser.screenshot("before-html-test")
  })

  // beforeEach(async () => {
  //   await browser.screenshot("before-each-html-test")
  // })

  it("should render static HTML content correctly", async () => {
    const htmlSelector = {
      selector: {
        controlType: "sap.ui.core.HTML",
        viewName: `${ns}.view.App`
      }
    }

    // @ts-expect-error
    const html = await browser.asControl<HTML>(htmlSelector).getWebElement()
    // the UI5 html control is represented with "just a div"
    const divs = await html.$$("div")
    const innerHTML = []
    for (const div of divs) {
      innerHTML.push(await div.getHTML(false)) // false to get inner HTML only
    }
    const expected = /<h1[^>]*>static html h1<\/h1>/i //> from the model/design time

    const containsExpected = innerHTML.some((html) => expected.test(html))

    expect(containsExpected).toBeTruthy()
  })

  it("should render FEEL/dynamically assigned HTML content correctly", async () => {
    await browser.executeAsync((done: Function) => {
      const bpmnForm = sap.ui.getCore().byId("__xmlview0--BPMNform") //> gnarf
      // @ts-expect-error this is dirrrty stuff - don't do it at home, kids
      const models = bpmnForm._getPropertiesToPropagate().oModels

      for (const [modelName, _] of Object.entries(models)) {
        if (modelName.startsWith("id-")) {
          ;(bpmnForm.getModel(modelName) as JSONModel).setProperty(
            "/BPMNform/variables/dynamicHeader",
            "this is a dynamic header"
          )
        }
      }

      // @ts-expect-error
      bpmnForm.reset()
      // @ts-expect-error
      bpmnForm.processForm(window._data) //> storing the ws data on window is done in webSocketMockServer.ts

      done()
    })

    const pageSelector = {
      selector: {
        controlType: "sap.m.Page",
        viewName: `${ns}.view.App`
      }
    }

    // @ts-expect-error
    const html = await browser.asControl<HTML>(pageSelector).getWebElement()
    // the UI5 html control is represented with "just a div"
    const divs = await html.$$("div")
    const innerHTML = []

    for (const div of divs) {
      innerHTML.push(await div.getHTML(false)) // false to get inner HTML only
    }
    const expected = /<h2[^>]*>this is a dynamic header<\/h2>/i //> from the model/design time

    const containsExpected = innerHTML.some((html) => expected.test(html))

    expect(containsExpected).toBeTruthy()
  })

  it("should handle code injection attempts properly", async () => {
    await browser.executeAsync((done: Function) => {
      const bpmnForm = sap.ui.getCore().byId("__xmlview0--BPMNform") //> gnarf
      // @ts-expect-error this is dirrrty stuff - don't do it at home, kids
      const models = bpmnForm._getPropertiesToPropagate().oModels

      for (const [modelName, _] of Object.entries(models)) {
        if (modelName.startsWith("id-")) {
          ;(bpmnForm.getModel(modelName) as JSONModel).setProperty(
            "/BPMNform/variables/dynamicHeader",
            "<script>alert('XSS')</script>"
          )
        }
      }

      // @ts-expect-error
      bpmnForm.reset()
      // @ts-expect-error
      bpmnForm.processForm(window._data) //> storing the ws data on window is done in webSocketMockServer.ts

      done()
    })

    const pageSelector = {
      selector: {
        controlType: "sap.m.Page",
        viewName: `${ns}.view.App`
      }
    }

    // @ts-expect-error
    const html = await browser.asControl<HTML>(pageSelector).getWebElement()
    // the UI5 html control is represented with "just a div"
    const divs = await html.$$("div")
    const innerHTML = []

    for (const div of divs) {
      innerHTML.push(await div.getHTML(false)) // false to get inner HTML only
    }

    // script tags should be removed, empty h2
    const expected = /<h2[^>]*><\/h2>/i //> from the model/design time

    const containsExpected = innerHTML.some((html) => expected.test(html))

    expect(containsExpected).toBeTruthy()
  })
})
