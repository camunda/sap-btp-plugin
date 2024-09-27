import Control from "sap/ui/core/Control"
import RenderManager from "sap/ui/core/RenderManager"

/**
 * @namespace io.camunda.connector.sap.btp.control
 */
class Fontawesome extends Control {
  metadata = {
    properties: {
      type: {
        type: "string"
      }
    }
  }

  setType = (type: string) => {
    this.setProperty("type", type)
    this.$("i").attr("class", `fa ${type}`)
  }

  renderer = {
    apiVersion: 2,

    render: (rm: RenderManager, control: Fontawesome): void => {
      rm.openStart("i", control)
      rm.class("fa")
      rm.class(`${control.getType()}`)
      rm.openEnd()
      rm.close("i")
    }
  }
}

export default Fontawesome
