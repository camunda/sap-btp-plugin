import Log from "sap/base/Log"
import MessageToast from "sap/m/MessageToast"
import EventBus from "sap/ui/core/EventBus"
import Message from "sap/ui/core/message/Message"
import MessageType from "sap/ui/core/message/MessageType"
import WebSocket from "sap/ui/core/ws/WebSocket"
import { CamundaRequest } from "./CamundaData"
// import Core from "sap/ui/core/Core"
// import ResourceModel from "sap/ui/model/resource/ResourceModel"
// import ResourceBundle from "sap/base/i18n/ResourceBundle"

const channel = "/channel"

class SingletonWebSocket extends WebSocket {
  private static instance: SingletonWebSocket
  private static channelId: string
  i18n: import("sap/base/i18n/ResourceBundle").default | Promise<import("sap/base/i18n/ResourceBundle").default>

  /**
   * The Singleton's constructor should always be private to prevent direct
   * construction calls with the `new` operator.
   */
  private constructor(channelId: string) {
    super(`${channel}/${channelId}`)
    // this.i18n = (Core.getModel("i18n") as ResourceModel).getResourceBundle()
  }

  /**
   * The static method that controls the access to the singleton instance.
   *
   * This implementation let you subclass the Singleton class while keeping
   * just one instance of each subclass around.
   */
  public static getInstance(channelId: string): SingletonWebSocket {
    if (!SingletonWebSocket.instance) {
      SingletonWebSocket.instance = new SingletonWebSocket(channelId)
      SingletonWebSocket.channelId = channelId
    }

    return SingletonWebSocket.instance
  }

  public getChannel() {
    return channel
  }
  public getChannelId() {
    return SingletonWebSocket.channelId
  }

  public runProcess(processId: string, channelId: string, variables?: string) {
    EventBus.getInstance().publish("Camunda", "request", {
      status: CamundaRequest.started,
      channelId
    })
    EventBus.getInstance().publish("Camunda", "startProcess", {})
    void (async () => {
      const response = await fetch("/backend/odata/v4/bpmn/runProcess", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          bpmnProcessId: processId,
          // the channel id is set when opening the ui, via get url parameter
          channelId: channelId,
          variables
        })
      })
      if (response.ok && response.status < 300) {
        // const runData = (await response.json()) as CamundaRunReturn
        // EventBus.getInstance().publish("Camunda", "run", runData)
        if (new URL(document.location.href).searchParams.get("debug")) {
          const message = `${processId} for client ${channelId} started!`
          MessageToast.show(message)
          Log.info(message)
        }
      } else {
        const message = await response.text()
        EventBus.getInstance().publish(
          "all-messages",
          "message",
          new Message({
            // message: (this.i18n as ResourceBundle).getText("WebSocket.errorMessageHeader", [processId]),
            message: `Error running process ${processId} for client ${channelId}`,
            // additionalText: (this.i18n as ResourceBundle).getText("WebSocket.errorMessageHeader", [message]),
            additionalText: `error: ${message}`,
            type: MessageType.Error
          })
        )
      }
    })()
  }
}

export default SingletonWebSocket
