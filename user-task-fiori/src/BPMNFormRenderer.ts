/*!
 * ${copyright}
 */

// import Lib from "sap/ui/core/Lib"
import Control from "sap/ui/core/Control"
import RenderManager from "sap/ui/core/RenderManager"
import BPMNForm from "./BPMNForm"
import Lib from "sap/ui/core/Lib"
// import { ExampleColor } from "./library";

/**
 * Example renderer.
 * @namespace
 */
export default {
  apiVersion: 4, // usage of DOM Patcher

  /**
   * Renders the HTML for the given control, using the provided {@link RenderManager}.
   *
   * @param rm The reference to the <code>sap.ui.core.RenderManager</code>
   * @param control The control instance to be rendered
   */
  render: function (rm: RenderManager, control: BPMNForm) {
    const i18n = Lib.getResourceBundleFor("io.camunda.connector.sap.btp.lib")

    console.debug(`[${control.getMetadata().getName()}] > rendering`)
    rm.openStart("div", control)
    // rm.style("width", "35rem")
    // make a horizontally and vertically centered container
    // rm.style("display", "flex")
    // rm.style("flex-direction", "column")
    // rm.style("justify-content", "center")
    // rm.style("align-items", "center")
    // // rm.style("height", "100%")
    // // rm.style("width", "100%")
    // rm.style("padding", "1rem")
    // rm.openEnd()
    if (control.getAggregation("items")) {
      ;(control.getAggregation("items") as Control[]).forEach((control: Control) => {
        rm.renderControl(control)
      })
    } else {
		rm.text(i18n.getText("BPMNForm.bpmn_placeholder_text"))
	}

    rm.close("div")
  }
}
