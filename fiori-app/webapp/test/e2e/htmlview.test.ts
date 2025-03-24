import _ui5Service from "wdio-ui5-service"
const ui5Service = new _ui5Service()

import { ns, mockIndex, formTarget, injectFEEL } from "./po/commons"
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
    const feelVars = [{
      name: "dynamicHeader",
      value: "this is a dynamic header"
    }]
    await injectFEEL("__xmlview0--BPMNform", feelVars)

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

    const feelVars = [{
      name: "dynamicHeader",
      value: "<script>alert('XSS')</script>"
    }]
    await injectFEEL("__xmlview0--BPMNform", feelVars)

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
