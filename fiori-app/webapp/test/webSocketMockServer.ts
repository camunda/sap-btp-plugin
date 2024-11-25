import SingletonWebSocket from "../util/WebSocket"
import UriParameters from "sap/base/util/UriParameters"
import EventBus from "sap/ui/core/EventBus"
import { CamundaRequest } from "../util/CamundaData"

const channelId = UriParameters.fromURL(window.location.href).get("channelId")
const websocket = SingletonWebSocket.getInstance(channelId)

const MockServer = {
  init() {
    window.setTimeout(() => {
      const mockForm = UriParameters.fromURL(window.location.href).get("mock")
      if (mockForm) {
        this.runForm(mockForm)
      }
    }, 3000)
  },

  runForm(mockForm: string) {
    EventBus.getInstance().publish("Camunda", "request", {
      status: CamundaRequest.started,
      channelId
    })
    return new Promise((fnResolve: Function) => {
      // error- and other messages shall come with some delay
      // simulating wait time for backend
      const timeout = mockForm.startsWith("message-") ? 1000 : 0
      window.setTimeout(() => {
        $.get(`test/assets/mockdata/camunda/${mockForm}.json`, (data) => {
          if (data.formData) {
            const regex = /\n/gm
            data.formData = data.formData.replace(regex, "\\n")
          }
          data.channelId = UriParameters.fromURL(window.location.href).get("channelId")
          websocket.fireMessage({ data: JSON.stringify(data) })
          fnResolve()
        })
      }, timeout)
    })
  }
}

window.webSocketMockServer = MockServer

export default MockServer
