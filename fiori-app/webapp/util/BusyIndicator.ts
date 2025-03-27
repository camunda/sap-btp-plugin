import EventBus from "sap/ui/core/EventBus"
import { CamundaRequest } from "../util/CamundaData"

export default class BusyIndicator {
  private _status: boolean

  constructor() {
    EventBus.getInstance().subscribe("Camunda", "request", (channel: string, event: string, data: { status: CamundaRequest }) => {
      switch (data.status) {
        case CamundaRequest.started:
          {
            this._status = true
            window.setTimeout(() => {
              if (this._status === true) {
                // $("#splash").removeClass("fadeOut").addClass("fadeIn")
                $("#splash").show()
              }
            }, 500)
          }
          break
        case CamundaRequest.stopped:
          {
            this._status = false
            // $("#splash").removeClass("fadeIn").addClass("fadeOut")
            $("#splash").hide()
          }
          break
      }
    })
  }
}
