/* eslint-disable @typescript-eslint/no-unused-expressions */
import Log from "sap/base/Log"
import UIComponent from "sap/ui/core/UIComponent"
import JSONModel from "sap/ui/model/json/JSONModel"
import EventBus from "sap/ui/core/EventBus"

import "@ui5/webcomponents/dist/Assets"
import "@ui5/webcomponents-icons/dist/AllIcons"

// import and usage only to tick off the bundler to include the lib
import { evaluate } from "feelers"
import SingletonWebSocket from "./util/WebSocket"
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

      const pid = new URL(document.location.href).searchParams.get("pid")
      if (pid) {
        // get data to resume from BE
        fetch(`/backend/odata/v4/bpmn/UserTasks('${pid}')`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json"
          }
        })
          .then((response) => response.json())
          // send to event bus in order to trigger a form rendering
          // so that the process can be resumed
          .then((data) => {
            Log.info(`[${this.getMetadata().getName()}] - data received:`, JSON.stringify(data))
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const { jobKey, formData, variables }: { jobKey: string, formData: string, variables: string } = data
            const wsData = {
              channelId,
              type: "form",
              jobKey,
              formData,
              variables
            }
            // .send no good as it doesn't trigger the listeners
            SingletonWebSocket.getInstance(channelId).fireMessage({ data: JSON.stringify(wsData) })
          }).catch((error) => {
            Log.error(`[${this.getMetadata().getName()}] - error: ${error}!`)
          })
      }

      //   Log.info("//> triggering BPMN run...")

      //   const ws = SingletonWebSocket.getInstance(channelId)
      //   ws.runProcess("Process_X_SteuerungPACS", channelId)
    }
  }
}
