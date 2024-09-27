import WebSocket from "sap/ui/core/ws/WebSocket"
import MessageToast from "sap/m/MessageToast"
import UriParameters from "sap/base/util/UriParameters"
import { CamundaRequest, CamundaRunReturn } from "./CamundaData"
import Message from "sap/ui/core/message/Message"
import { MessageType } from "sap/ui/core/library"
import Log from "sap/base/Log"

const channel = "/channel"

class SingletonWebSocket extends WebSocket {
  private static instance: SingletonWebSocket
  private static channelId: string

  /**
   * The Singleton's constructor should always be private to prevent direct
   * construction calls with the `new` operator.
   */
  private constructor(channelId: string) {
    super(`${channel}/${channelId}`)
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

  public runProcess(processId: string, channelId?: string, variables?: string) {
    if (!channelId || channelId === "") {
      channelId = UriParameters.fromURL(window.location.href).get("channelId")
      Log.info(`//> backup: channelId from url: ${channelId}`)
    }

    sap.ui.getCore().getEventBus().publish("Camunda", "request", {
      status: CamundaRequest.started,
      channelId
    })
    sap.ui.getCore().getEventBus().publish("Camunda", "startProcess", {})
    void (async () => {
      const response = await fetch("/bpmn/run", {
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
      const runData = (await response.json()) as CamundaRunReturn
      sap.ui.getCore().getEventBus().publish("Camunda", "run", runData)
      if (response.ok && response.status < 300) {
        if (jQuery.sap.getUriParameters().get("bdaas-debug") === "true") {
          const message = `${processId} for client ${channelId} started!`
          MessageToast.show(message)
          Log.info(message)
        }
      } else {
        let message = JSON.stringify(response.body)
        if (response.status === 403) {
          message =
            "Sie verfügen derzeit nicht über eine BDaaS Berechtigung. Bitte wenden Sie sich an Ihren Administrator."
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        sap.ui
          .getCore()
          .getEventBus()
          .publish(
            "all-messages",
            "message",
            new Message({
              message: `Fehler beim Start von ${processId}\n`,
              additionalText: message,
              type: MessageType.Error
            })
          )
      }
    })()
  }
}

export default SingletonWebSocket
