/* eslint-disable @typescript-eslint/no-unused-expressions */
import UIComponent from "sap/ui/core/UIComponent"
import models from "./model/models"
import Device from "sap/ui/Device"
import Log from "sap/base/Log"
import Core from "sap/ui/core/Core"
import EventBus from "sap/ui/core/EventBus"

/**
 * @namespace io.camunda.connector.sap.btp.app
 */
export default class Component extends UIComponent {
  public static metadata = {
    manifest: "json"
  }

  private contentDensityClass: string
  DEBUG: string

  public init(): void {
    this.DEBUG = new URL(document.location.href).searchParams.get("debug")
    if (this.DEBUG) {
      Log.setLevel(Log.Level.DEBUG)
      Log.debug(`[${this.getMetadata().getName()}] - Debug mode is enabled`)
    }

    super.init()

    // pipe sap ui core event bus messages through to component event bus
	EventBus.getInstance().subscribe("all-messages", "message", (channel: string, event: string, data: object) => {
		this.getEventBus().publish("all-messages", "message", data)
    })


    // create the device model
    this.setModel(models.createDeviceModel(), "device")

	//> TODO: do we need this?
    // create the views based on the url/hash
    // this.getRouter().initialize();
  }

  /**
   * This method can be called to determine whether the sapUiSizeCompact or sapUiSizeCozy
   * design mode class should be set, which influences the size appearance of some controls.
   * @public
   * @returns css class, either 'sapUiSizeCompact' or 'sapUiSizeCozy' - or an empty string if no css class should be set
   */
  public getContentDensityClass(): string {
    if (this.contentDensityClass === undefined) {
      // check whether FLP has already set the content density class; do nothing in this case
      if (document.body.classList.contains("sapUiSizeCozy") || document.body.classList.contains("sapUiSizeCompact")) {
        this.contentDensityClass = ""
      } else if (!Device.support.touch) {
        // apply "compact" mode if touch is not supported
        this.contentDensityClass = "sapUiSizeCompact"
      } else {
        // "cozy" in case of touch support; default for most sap.m controls, but needed for desktop-first controls like sap.ui.table.Table
        this.contentDensityClass = "sapUiSizeCozy"
      }
    }
    return this.contentDensityClass
  }
}
