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
import BPMNform from "../control/BPMNform"
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

enum FormStep {
  LOADING = 0,
  STARTED = 1,
  SUMMARY = 2,
  FINISHED = 3,
  FAILED = 4
}

/**
 * @namespace io.camunda.connector.sap.btp.controller
 */
export default class MainStageController extends BaseController {
  ws: WebSocket

  private _cucumberStatements: string[]

  private _cucumberFeatureTitleDialog: Dialog

  private busyIndicator: BusyIndicator

  /**
   * generates when step definition for current formular
   */
  copyCucumberFormStepToClipboard() {
    const commands = this.generateCucumberDataForCurrentForm()

    Clipboard.copyTextToClipboard(commands.join("\n"))
  }

  generateCucumberDataForCurrentForm() {
    if (!this.getModel("AppView").getProperty("/debug")) {
      return
    }

    const commands = []
    const wrapWith = { begin: "", end: "" }

    const bpmnForm = this.getView().byId("BPMNform") as BPMNform

    for (const index in bpmnForm.getItems()) {
      const data = bpmnForm.getItems()[index].data() as {
        controlType: ControlType
        control: Control
        varsToShow: [{ modelKey: string; value: string }]
      }
      if (data.controlType === ControlType.Summary) {
        const varsWhiteList = ["sachkonto", "investKosten", "anlagenklasse", "pspElement", "coElement"]
        commands.push("        Then I want to see as result")
        data.varsToShow.forEach((item) => {
          if (varsWhiteList.indexOf(item.modelKey) !== -1) {
            commands.push(`            | ${item.modelKey} | ${item.value} |`)
          }
        })
      } else {
        wrapWith.begin = "        When I fill the form"
        wrapWith.end = "        And I click next"
        let value = bpmnForm.getValueFromControl(data.element.type, data.control)
        if (data.control instanceof SelectList) {
          data.control.getItems().forEach((item) => {
            // get label from control
            if (item.getKey() === value) {
              value = item.getText()
            }
          })
        }
        if (data.control instanceof RadioButtonGroup) {
          data.control.getButtons().forEach((item: RadioButton) => {
            // get label from control
            if (item.getCustomData()[0].getKey() === value) {
              value = item.getText()
            }
          })
        }
        if (value) {
          commands.push(`            | ${CucumberType[data.controlType]} | ${value} | ${data.element.key} |`)
        }
      }
    }
    wrapWith.begin ? commands.unshift(wrapWith.begin) : ""

    wrapWith.end ? commands.push(wrapWith.end) : ""
    return commands
  }

  downloadCucumberFormStreak() {
    function download(filename: string, text: string) {
      const element = document.createElement("a")
      element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(text))
      element.setAttribute("download", filename)

      element.style.display = "none"
      document.body.appendChild(element)

      element.click()

      document.body.removeChild(element)
    }

    this.getModel("AppView").setProperty("/FeatureTitle", "")
    if (!this._cucumberFeatureTitleDialog) {
      this._cucumberFeatureTitleDialog = new Dialog({
        title: "Cucumber Feature",
        type: DialogType.Message,
        content: [
          new Label({
            text: "Wie lautet die Beschreibung des Features?",
            labelFor: "rejectionNote"
          }),
          new TextArea("rejectionNote", {
            width: "100%",
            placeholder: "Beschreibung",
            value: "{AppView>/FeatureTitle}"
          })
        ],
        beginButton: new Button({
          type: ButtonType.Emphasized,
          text: "Download",
          press: () => {
            var sText = this.getModel("AppView").getProperty("/FeatureTitle")
            let commands = this._cucumberStatements.slice().concat(this.generateCucumberDataForCurrentForm())
            commands.unshift(`Feature: ${sText}\n\n    Scenario: ExecuteForm\n        Given I start the "bdaas"`)
            download("cucumber.feature", commands.join("\n"))
            this._cucumberFeatureTitleDialog.close()
          }
        }),
        endButton: new Button({
          text: "Cancel",
          press: () => {
            this._cucumberFeatureTitleDialog.close()
          }
        })
      })
    }

    this.getView().addDependent(this._cucumberFeatureTitleDialog)

    this._cucumberFeatureTitleDialog.open()
  }

  onDownloadCucumberFormStreak() {
    this.downloadCucumberFormStreak()
  }

  onCopyCucumber() {
    this.copyCucumberFormStepToClipboard()
  }

  async onClose() {
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

  async onFinish() {
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

    viewModel.setProperty("/formStep", FormStep.FINISHED)

    await this.startFinishAnimation()
    window.close()
  }

  onFinishedForm() {
    const viewModel = this.getView().getModel("AppView") as JSONModel
    viewModel.setProperty("/formStep", FormStep.FINISHED)
  }

  getBpmnForm(): BPMNform {
    return this.getView().byId("BPMNform") as BPMNform
  }

  async onSubmit(/* sChannel: string, sEvent: string, oEvent: Event */): Promise<void> {
    const viewModel = this.getView().getModel("AppView") as JSONModel
    viewModel.setProperty("/formStep", FormStep.LOADING)
    this._cucumberStatements = this._cucumberStatements.concat(this.generateCucumberDataForCurrentForm())
    sap.ui.getCore().getEventBus().publish("Camunda", "request", {
      status: CamundaRequest.started
    })
    const rawData = this.getView().getModel("AppView").getProperty("/userFormData") as string
    const _json: WebSocketData = JSON.parse(rawData) as WebSocketData
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const form: BPMNform = this.getView().byId("BPMNform") as BPMNform
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
    const historyModel = this.getModel("HistoryView")
    let qa = []
    userSuppliedData.forEach((data) => {
      if (data.answer) {
        qa.push({
          question: data.question,
          linkedControlType: data.linkedControlType,
          answer: data.answer
        })
      }
    })
    // provide data to protocoll
    historyModel.setProperty("/qa", historyModel.getProperty("/qa").concat(qa))
    this.getBpmnForm().reset()
    try {
      const res = await fetch("/bpmn/completeUsertask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          bdaasBasketId: _json.variables.bdaasBasketId,
          bdaasBasketPositionId: _json.variables.bdaasBasketPositionId,
          jobKey: _json.jobKey,
          historicBasketPositionId: this.getBpmnForm().getHistoricBasketPositionId(),
          qa: JSON.stringify(qa),
          variables: formVariables
        })
      })
      if (!res.ok) {
        const message = await res.json()
        this.getOwnerComponent()
          .getEventBus()
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
      this.getOwnerComponent()
        .getEventBus()
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
    this._cucumberStatements = []

    this.busyIndicator = new BusyIndicator()

    const eventBus = sap.ui.getCore().getEventBus()

    eventBus.subscribe("App", "submit", this.onSubmit)
    this._attachWebSocketMessageHandler()
  }

  onProtocol(oEvent: Event): void {
    const eventBus = this.getOwnerComponent().getEventBus()
    eventBus.publish("App", "showProtocol", oEvent.getSource())
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
            case "errorObserver":
              if (_data.data.duration) {
                sap.ui.getCore().getEventBus().publish("ErrorObserver", "duration", {
                  duration: _data.data.duration
                })
              }
              break
            case "form":
              sap.ui.getCore().getEventBus().publish("Camunda", "request", {
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
              sap.ui.getCore().getEventBus().publish("Camunda", "request", {
                status: CamundaRequest.stopped,
                channelId: _data.channelId
              })
              const receivedMessage: Message = new Message({
                message: _data.message.text,
                description: _data.message.description || "",
                additionalText: _data.message.additionalText || "",
                type: _data.message.type
              })
              this.getOwnerComponent().getEventBus().publish("all-messages", "message", receivedMessage)
              break

            case "final-task-fail":
              viewModel.setProperty("/formStep", FormStep.FAILED)
              sap.ui.getCore().getEventBus().publish("Camunda", "request", {
                status: CamundaRequest.stopped,
                channelId: _data.channelId
              })
              // eslint-disable-next-line @typescript-eslint/no-extra-semi
              this.getBpmnForm().endProcess(_data)
              break
            case "final-task-success":
              viewModel.setProperty("/formStep", FormStep.SUMMARY)
              sap.ui.getCore().getEventBus().publish("Camunda", "request", {
                status: CamundaRequest.stopped,
                channelId: _data.channelId
              })
              // eslint-disable-next-line @typescript-eslint/no-extra-semi
              this.getBpmnForm().endProcess(_data)
              break

            default:
              sap.ui.getCore().getEventBus().publish("Camunda", "request", {
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
  historicizeUserData(data: userQuestionAnswer[]): void {
    const model = this.getOwnerComponent().getModel("HistoryView") as JSONModel
    const originalData = model.getProperty("/qa") as userQuestionAnswer[]
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const newData = originalData.concat(data)
    model.setProperty("/qa", newData)
  }
}
