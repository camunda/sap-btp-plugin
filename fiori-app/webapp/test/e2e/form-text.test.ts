import _ui5Service from "wdio-ui5-service"
const ui5Service = new _ui5Service()

import { ns, mockIndex, formTarget, injectFEEL } from "./po/commons"
import Markdown from "ui5-cc-md"

describe("text input", () => {
  before(async () => {
    await browser.goTo(mockIndex())
    await ui5Service.injectUI5()
    await formTarget("text-8.6")
    // await browser.screenshot("before-text-input")
  })

  // beforeEach(async () => {
  //   await browser.screenshot("before-each-text-input")
  // })

  it("basic rendering", async () => {
    const textSelector = {
      selector: {
        controlType: "cc.md.Markdown",
        viewName: `${ns}.view.App`
      }
    }
    //> from the model/design time
    const expected = [
      /<h1[^>]*>some static text<\/h1>/i,
      /<h1[^>]*>heading 1<\/h1>/i,
      /<h2[^>]*>heading 2<\/h2>/i,
      /<h3[^>]*>heading 3<\/h3>/i,
      /<ul>\s*<li>list item 1<\/li>\s*<li>list item 2<\/li>\s*<\/ul>/i,
      /<p[^>]*>some text<\/p>/i
    ]
    const markdowns = await browser.allControls<Markdown>(textSelector)
    const all = []
    for (const control of markdowns) {
      all.push(await control.getWebElement())
    }
    const innerHTML = []
    for (const control of all) {
      innerHTML.push(await control.getHTML(false))
    }
    expect(innerHTML[0]).toMatch(expected[0])
    expect(innerHTML[1]).toMatch(expected[1])
    expect(innerHTML[1]).toMatch(expected[2])
    expect(innerHTML[1]).toMatch(expected[3])
    expect(innerHTML[1]).toMatch(expected[4])
    expect(innerHTML[2]).toMatch(expected[5])
  })

  it("should hide the text when the visibility is set to false", async () => {
    const textSelector = {
      selector: {
        controlType: "cc.md.Markdown",
        viewName: `${ns}.view.App`
      },
      forceSelect: true
    }
    const markdowns = await browser.allControls<Markdown>(textSelector)
    const visibleControls = markdowns.length
    for (const control of markdowns) {
      expect(await control.getVisible()).toBe(true)
    }
    
    const feelVars = [{ name: "invisible", value: true }]
    await injectFEEL("__xmlview0--BPMNform", feelVars)
    const markdownsAfter = await browser.allControls<Markdown>(textSelector)
    const visibleControlsAfter = markdownsAfter.length
    expect(visibleControlsAfter).toBeLessThan(visibleControls)
  })
})
