import _ui5Service from "wdio-ui5-service"
const ui5Service = new _ui5Service()

import { ns, mockIndex, formTarget, injectFEEL } from "./po/commons"
import Image from "sap/m/Image"

describe("sap.m.Image", () => {
  before(async () => {
    await browser.goTo(mockIndex())
    await ui5Service.injectUI5()
    await formTarget("img-view")
    // await browser.screenshot("before-image-test")
  })

  // beforeEach(async () => {
  //   await browser.screenshot("before-each-img-view")
  // })

  it("should display an image with the correct source and alt text", async () => {
    const imageSelector = {
      selector: {
        controlType: "sap.m.Image",
        viewName: `${ns}.view.MainStage`
      }
    }

    const image = await browser.asControl<Image>(imageSelector)
    const src = await image.getSrc()
    expect(src).toContain("https://picsum.photos/id/13/300/200")
    const alt = await image.getAlt()
    expect(alt).toEqual("a pebble beach")
  })

  it("should hide the image when the visibility is set to false", async () => {
    const imageSelector = {
      selector: {
        controlType: "sap.m.Image",
        viewName: `${ns}.view.MainStage`
      },
      forceSelect: true
    }
    const images = await browser.allControls<Image>(imageSelector)
    const visibles = []
    for (const image of images) {
      visibles.push(await image.getVisible())
    }
    expect(visibles.every((visible) => visible)).toBeTruthy()

    const feelVars = [{ name: "invisible", value: true }]
    await injectFEEL("__xmlview0--BPMNform", feelVars)

    const imagesAfter = await browser.allControls<Image>(imageSelector)
    // we're after the 2nd image only -> it is not present
    expect(imagesAfter.length).toBe(1)
  })
})
