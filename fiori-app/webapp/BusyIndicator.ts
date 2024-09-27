import { CamundaRequest } from "../util/CamundaData"

export default class BusyIndicator {
  private _status: Boolean

  constructor() {
    const eventBus = sap.ui.getCore().getEventBus()
    eventBus.subscribe("Camunda", "request", (channel: string, event: string, data: { status: CamundaRequest }) => {
      switch (data.status) {
        case CamundaRequest.started:
          {
            this._status = true
            window.setTimeout(() => {
              if (this._status === true) {
                $("#splash").removeClass("fadeOut").addClass("fadeIn")
              }
            }, 500)
          }
          break
        case CamundaRequest.stopped:
          {
            this._status = false
            $("#splash").removeClass("fadeIn").addClass("fadeOut")
          }
          break
      }
    })
  }
}
