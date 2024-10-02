/* eslint-disable @typescript-eslint/no-unused-expressions */
import Log from "sap/base/Log"
import EventBus from "sap/ui/core/EventBus"
import UIComponent from "sap/ui/core/UIComponent"

/**
 * @namespace io.camunda.connector.sap.btp.app
 */
export default class Component extends UIComponent {
  public static metadata = {
    manifest: "json"
  }

  DEBUG: string

  init(): void {
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
  }

  redirect() {
    const startUrl = new URL(window.location.href)
    if (!window.location.pathname.includes("index.html")) {
      startUrl.pathname += "index.html"
    }
    const channelId = (Math.random() + 1).toString(36).substring(2)
    startUrl.searchParams.set("channelId", channelId)
    window.location.href = startUrl.toString() // bye-bye
  }

  onAfterRendering() {
    // "channelId" must be passed by the calling application as it
    // _uniquely_ links the service layer's websocket server with the client running this code
    const channelId = new URL(document.location.href).searchParams.get("channelId")
    if (!channelId) {
      Log.info(`[${this.getMetadata().getName()} NO channel id detected...reloading`)
      this.redirect()
    }
    // else {
    //   // "persist" the channel id for app-wide reference
    //   ;(this.getModel("AppView") as JSONModel).setProperty("/channelId", channelId)
    //   Log.info(`[${this.getMetadata().getName()}] -- channel id detected: ${channelId}!`)

    //   Log.info("//> triggering BPMN run...")

    //   const ws = SingletonWebSocket.getInstance(channelId)
    //   ws.runProcess("Process_X_SteuerungPACS", channelId)
    // }
  }
}
