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
import ResourceBundle from "sap/base/i18n/ResourceBundle"
import BPMNForm from "io/camunda/connector/sap/btp/lib/BPMNForm"

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

  onFinish() {
    const viewModel = this.getView().getModel("AppView") as JSONModel
    // const channelId = viewModel.getProperty("/channelId") as string

    // clean up ws inventory server-side
    // SingletonWebSocket.getInstance(channelId).close()

    viewModel.setProperty("/formStep", FormStep.FINISHED)

    void this.onSubmit() //> we don't care about async side effects on the browser at the last UI task

    // window.close()
  }

  onFinishedForm() {
    const viewModel = this.getView().getModel("AppView") as JSONModel
    viewModel.setProperty("/formStep", FormStep.FINISHED)
  }

  getBpmnForm(): BPMNForm {
    return this.getView().byId("BPMNform") as unknown as BPMNForm
  }

  async onSubmit(/* sChannel: string, sEvent: string, oEvent: Event */) {
    const viewModel = this.getView().getModel("AppView") as JSONModel
    if (viewModel.getProperty("/formStep") !== FormStep.FINISHED) {
      viewModel.setProperty("/formStep", FormStep.LOADING)
    }
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
      const res = await fetch("/backend/odata/v4/bpmn/completeUsertask", {
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
        EventBus.getInstance().publish(
          "all-messages",
          "message",
          new Message({
            type: MessageType.Error,
            message: (this.getResourceBundle() as ResourceBundle).getText("Error.cant_proceed.message"),
            description: (this.getResourceBundle() as ResourceBundle).getText("Error.cant_proceed.message", [
              res.status,
              res.statusText,
              res.text()
            ])
          })
        )
      }
    } catch (error) {
      EventBus.getInstance().publish(
        "all-messages",
        "message",
        new Message({
          type: MessageType.Error,
          message: (this.getResourceBundle() as ResourceBundle).getText("Error.cant_proceed.message"),
          description: (this.getResourceBundle() as ResourceBundle).getText("Error.cant_proceed.backend_error"),
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
    let channelId = this.getView()?.getModel("AppView")?.getProperty("/channelId") as string
    // safety net -> try to retrieve the channel id from the url
    if (!channelId || channelId === "") {
      channelId = new URL(document.location.href).searchParams.get("channelId")
    }
    return channelId
  }

  /**
   * trigger a deletion of the association btw PI and UI channel - 
   * note this is explicitly not awaited as not relevant for the UI's business logic
   * @param jobKey correlation to zeebe's job
   */
  _cleanupUIchannel(jobKey: string): void {
      void fetch("/backend/odata/v4/bpmn/deleteUIchannel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          jobKey
        })
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
          if (_data.variables?.appTitle) {
            viewModel.setProperty("/appTitle", _data.variables?.appTitle)
          }
          if (_data.variables?.bdaasBusyText) {
            document.getElementById("busyText").innerHTML = _data.variables?.busyText
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
              viewModel.setProperty("/formStep", FormStep.STARTED)
              this.getBpmnForm().reset()
              this.getBpmnForm().processForm(_data)
              break

            case "message": {
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
            }

            case "final-task-fail":
              EventBus.getInstance().publish("Camunda", "request", {
                status: CamundaRequest.stopped,
                channelId: _data.channelId
              })
              this.getBpmnForm().processVariables(_data)
              this.getBpmnForm().reset()
              viewModel.setProperty("/formStep", FormStep.SUMMARY)
              this.getBpmnForm().processForm(_data)
              this.getBpmnForm().endProcess(_data)
              this._cleanupUIchannel(_data.jobKey)
              break
            case "final-task-success":
              EventBus.getInstance().publish("Camunda", "request", {
                status: CamundaRequest.stopped,
                channelId: _data.channelId
              })
              this.getBpmnForm().processVariables(_data)
              this.getBpmnForm().reset()
              viewModel.setProperty("/formStep", FormStep.SUMMARY)
              this.getBpmnForm().processForm(_data)
              this.getBpmnForm().endProcess(_data)
              this._cleanupUIchannel(_data.jobKey)
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
