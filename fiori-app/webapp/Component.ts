/* eslint-disable @typescript-eslint/no-unused-expressions */
import Log from "sap/base/Log"
import UIComponent from "sap/ui/core/UIComponent"
import JSONModel from "sap/ui/model/json/JSONModel"

import "@ui5/webcomponents-icons/dist/AllIcons"
import "@ui5/webcomponents/dist/Assets"

// import and usage only to tick off the bundler to include the lib
import { evaluate } from "feelers"
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
      ;(this.getModel("AppView") as JSONModel).setProperty("/debug", true)
      Log.debug(`[${this.getMetadata().getName()}] - Debug mode is enabled`)
    }
    Log.info("//> feelers feeling ", evaluate("good")) //> usage and import mostly to tick off the bundler
    super.init()
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
    } else {
      // "persist" the channel id for app-wide reference
      ;(this.getModel("AppView") as JSONModel).setProperty("/channelId", channelId)
      Log.info(`[${this.getMetadata().getName()}] - channel id detected: ${channelId}!`)
    }
  }
}
