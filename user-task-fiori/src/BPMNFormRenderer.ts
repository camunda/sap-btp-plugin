import Control from "sap/ui/core/Control"
import RenderManager from "sap/ui/core/RenderManager"
import BPMNForm from "./BPMNForm"

export default {
  apiVersion: 4, // usage of DOM Patcher

  /**
   * Renders the HTML for the given control, using the provided {@link RenderManager}.
   *
   * @param rm The reference to the <code>sap.ui.core.RenderManager</code>
   * @param control The control instance to be rendered
   */
  render: function (rm: RenderManager, control: BPMNForm) {
    // const i18n = Lib.getResourceBundleFor("io.camunda.connector.sap.btp.lib")
    console.debug(`[${control.getMetadata().getName()}] > rendering`)
    
    rm.openStart("div", control)
    rm.openEnd()
    
    if (control.getAggregation("items")) {
      ;(control.getAggregation("items") as Control[]).forEach((control: Control) => {
        rm.renderControl(control)
      })
    } else {
      rm.text(control.getPlaceHolderText())
    }
  
		rm.close("div");
  }
}
