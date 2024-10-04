import WebSocket from "../util/WebSocket"
import BusyIndicator from "../util/BusyIndicator"
import Event from "sap/ui/base/Event"
import JSONModel from "sap/ui/model/json/JSONModel"
import Message from "sap/ui/core/message/Message"
import UriParameters from "sap/base/util/UriParameters"
import { WebSocketData } from "../util/WebSocketData"
import { CamundaRequest } from "../util/CamundaData"
import BaseController from "./BaseController"
import { ControlType, CucumberType, userFormData, userQuestionAnswer } from "../control/BPMNformData"
import Dialog from "sap/m/Dialog"
import { ButtonType, DialogType } from "sap/m/library"
import Label from "sap/m/Label"
import TextArea from "sap/m/TextArea"
import Button from "sap/m/Button"
import Control from "sap/ui/core/Control"
import SelectList from "sap/m/SelectList"
import RadioButtonGroup from "sap/m/RadioButtonGroup"
import RadioButton from "sap/m/RadioButton"
import Clipboard from "../util/Clipboard"
import SingletonWebSocket from "../util/WebSocket"
import Log from "sap/base/Log"
import { MessageType } from "sap/ui/core/library"
import EventBus from "sap/ui/core/EventBus"
import { BPMNform } from "io/camunda/connector/sap/btp/lib/BPMNformData"

enum FormStep {
  LOADING = 0,
  STARTED = 1,
  SUMMARY = 2,
  FINISHED = 3,
  FAILED = 4
}

/**
 * @namespace io.camunda.connector.sap.btp.app.controller
 */
export default class MainStageController extends BaseController {
  ws: WebSocket

  private busyIndicator: BusyIndicator

  onClose() {
    const viewModel = this.getView().getModel("AppView") as JSONModel
    const _sachkonto = viewModel.getProperty("/sachkonto") as string
    const _psp = viewModel.getProperty("/coElement") as string
    const _historyLink = viewModel.getProperty("/historyLink") as string
    const channelId = viewModel.getProperty("/channelId") as string

    if (viewModel.getProperty("/sourceSystem") === "Fiori") {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      window.opener.postMessage(
        {
          sachkonto: _sachkonto,
          psp: _psp,
          historyLink: _historyLink
        },
        "*"
      )
      Log.info(`//> postback w/ sachkonto: ${_sachkonto}, psp: ${_psp}, historyLink: ${_historyLink}`)
    }

    // clean up ws inventory server-side
    SingletonWebSocket.getInstance(channelId).close()

    window.close()
  }

  onFinish() {
    const viewModel = this.getView().getModel("AppView") as JSONModel
    const channelId = viewModel.getProperty("/channelId") as string

    // clean up ws inventory server-side
    SingletonWebSocket.getInstance(channelId).close()

    viewModel.setProperty("/formStep", FormStep.FINISHED)

    window.close()
  }

  onFinishedForm() {
    const viewModel = this.getView().getModel("AppView") as JSONModel
    viewModel.setProperty("/formStep", FormStep.FINISHED)
  }

  getBpmnForm(): BPMNform {
    return this.getView().byId("BPMNform") as unknown as BPMNform
  }

  async onSubmit(/* sChannel: string, sEvent: string, oEvent: Event */) {
    debugger
    const viewModel = this.getView().getModel("AppView") as JSONModel
    viewModel.setProperty("/formStep", FormStep.LOADING)
    EventBus.getInstance().publish("Camunda", "request", {
      status: CamundaRequest.started
    })
    const rawData = this.getView().getModel("AppView").getProperty("/userFormData") as string
    const _json: WebSocketData = JSON.parse(rawData) as WebSocketData
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const form: BPMNform = this.getBpmnForm() 
    const userSuppliedData: userFormData[] = form.getUserData()
    // if a user (form) task has supplied a process id for
    // re-use in user (form) tasks located in subprocess
    if (_json.parentProcessInstanceKey) {
      userSuppliedData.push({ key: "parentProcessInstanceKey", value: _json.parentProcessInstanceKey })
    }

    // transform array of objects into a string with wrapped {}
    // example: '{ "field_name": "Will Smith", "field_gender": "d", "option_weather_pref": "warm" }'
    const formVariables =
      "{" +
      userSuppliedData
        .map((data: userFormData) => {
          return `"${data.key}": ${JSON.stringify(data.value)}`
        })
        .join(",") +
      "}"

    // provide data to protocoll
    this.getBpmnForm().reset()
    try {
      const res = await fetch("/bpmn/completeUsertask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          jobKey: _json.jobKey,
          variables: formVariables
        })
      })
      if (!res.ok) {
        const message = await res.json()
        EventBus.getInstance()
          .publish(
            "all-messages",
            "message",
            new Message({
              type: MessageType.Error,
              message: "Abschließen des Schritts nicht möglich",
              description: `Camunda hat einen Fehler zurückgemeldet und der Schritt konnte nicht abgeschlossen werden. \n\n Error 1673253575610: ${res.status} ${res.statusText}\n\n ${message.error.message}`
            })
          )
      }
    } catch (error) {
      EventBus.getInstance()
        .publish(
          "all-messages",
          "message",
          new Message({
            type: MessageType.Error,
            message: "Abschließen des Schritts nicht möglich",
            description: `Die Kommunikation mit Camunda wurde unterbrochen und der Schritt konnte nicht abgeschlossen werden. \n\n Error 1673253816952: ${res.status} ${res.statusText}`,
            additionalText: JSON.stringify(error)
          })
        )
    }
  }

  onInit(): void {
    this.busyIndicator = new BusyIndicator()

    EventBus.getInstance().subscribe("App", "submit", this.onSubmit)
    this._attachWebSocketMessageHandler()
  }

  _getChannelId(): string {
    // only process further when the emitter sent "us" (aka our channel id) the ws-message
    let storedChannelId = this.getView()?.getModel("AppView")?.getProperty("/channelId") as string
    // safety net -> try to retrieve the channel id from the url
    if (!storedChannelId || storedChannelId === "") {
      storedChannelId = UriParameters.fromURL(window.location.href).get("channelId")
    }
    return storedChannelId
  }

  async setFinishedAnimationStep(step: number, timeout: number): Promise<void> {
    return new Promise((resolve) => {
      window.setTimeout(() => {
        $("body").addClass(`step${step}`)
        resolve()
      }, timeout)
    })
  }

  async startFinishAnimation(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      // new Audio("./media/short_sound.mp3").play()

      $("body").addClass("finishedPacs")
      await this.setFinishedAnimationStep(1, 0)
      await this.setFinishedAnimationStep(2, 2000)
      await this.setFinishedAnimationStep(3, 1000)
      resolve()
    })
  }

  _attachWebSocketMessageHandler(): void {
    const channelId = this._getChannelId()
    this.ws = WebSocket.getInstance(channelId)
    this.ws.attachMessage((oEvent: Event) => {
      // put the "pushed" message into the app-wide view model
      const data = oEvent.getParameter("data") as string
      Log.info(`//> received on channel ${this.ws.getChannel()}: %s`, data)
      const viewModel = this.getView().getModel("AppView") as JSONModel

      if (data) {
        // only process further when the emitter sent "us" (aka our channel id) the ws-message
        const storedChannelId = this._getChannelId()
        const _data: WebSocketData = JSON.parse(data) as WebSocketData

        Log.info(`//> received data for channel ${_data.channelId}, self: ${storedChannelId}`)

        if (_data.channelId && storedChannelId && _data.channelId === storedChannelId) {
          if (_data.variables?.bdaasTitle) {
            viewModel.setProperty("/bdaasTitle", _data.variables?.bdaasTitle)
          }
          if (_data.variables?.bdaasBusyText) {
            document.getElementById("bdaas-busyText").innerHTML = _data.variables?.bdaasBusyText
          }
          if (_data.variables?.WPS4_ProcessStart) {
            viewModel.setProperty("/WPS4_ProcessStart", _data.variables?.WPS4_ProcessStart)
            viewModel.setProperty("/PPCBusinessTransaction", _data.variables?.PPCBusinessTransaction)
            viewModel.setProperty("/PPCItemCategory", _data.variables?.PPCItemCategory)
          }

          //> it's us! let's go
          viewModel.setProperty("/userFormData", data)

          switch (_data.type) {
            case "variables":
              this.getBpmnForm().processVariables(_data)
              break
      
            case "form":
              EventBus.getInstance().publish("Camunda", "request", {
                status: CamundaRequest.stopped,
                channelId: _data.channelId
              })
              this.getBpmnForm().processVariables(_data)
              // eslint-disable-next-line @typescript-eslint/no-extra-semi
              viewModel.setProperty("/formStep", FormStep.STARTED)
              this.getBpmnForm().reset()
              this.getBpmnForm().processForm(_data)
              break

            case "message":
              EventBus.getInstance().publish("Camunda", "request", {
                status: CamundaRequest.stopped,
                channelId: _data.channelId
              })
              const receivedMessage: Message = new Message({
                message: _data.message.text,
                description: _data.message.description || "",
                additionalText: _data.message.additionalText || "",
                type: _data.message.type
              })
              EventBus.getInstance().publish("all-messages", "message", receivedMessage)
              break

            case "final-task-fail":
              viewModel.setProperty("/formStep", FormStep.FAILED)
              EventBus.getInstance().publish("Camunda", "request", {
                status: CamundaRequest.stopped,
                channelId: _data.channelId
              })
              // eslint-disable-next-line @typescript-eslint/no-extra-semi
              this.getBpmnForm().endProcess(_data)
              break
            case "final-task-success":
              viewModel.setProperty("/formStep", FormStep.SUMMARY)
              EventBus.getInstance().publish("Camunda", "request", {
                status: CamundaRequest.stopped,
                channelId: _data.channelId
              })
              // eslint-disable-next-line @typescript-eslint/no-extra-semi
              this.getBpmnForm().endProcess(_data)
              break

            default:
              EventBus.getInstance().publish("Camunda", "request", {
                status: CamundaRequest.stopped,
                channelId: _data.channelId
              })
              this.getOwnerComponent().getEventBus().publish("all-messages", "message", _data)
              break
          }
        }
      }
    })
  }
  
}
