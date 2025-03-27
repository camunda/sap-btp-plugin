import Log from "sap/base/Log"
import Dialog from "sap/m/Dialog"
import Input from "sap/m/Input"
import Menu from "sap/m/Menu"
import MessageBox from "sap/m/MessageBox"
import Event from "sap/ui/base/Event"
import Control from "sap/ui/core/Control"
import EventBus from "sap/ui/core/EventBus"
import Fragment from "sap/ui/core/Fragment"
import Message from "sap/ui/core/message/Message"
import JSONModel from "sap/ui/model/json/JSONModel"
import SingletonWebSocket from "../util/WebSocket"
import BaseController from "./BaseController"

/**
 * @namespace io.camunda.connector.sap.btp.app.controller
 */
export default class App extends BaseController {
  private generalMenu: Menu
  private runThisProcessDialog: Dialog

  public onInit() {
    EventBus.getInstance().subscribe("all-messages", "message", this.onMessageReceived.bind(this), this)
  }

  private onMessageReceived(channel: string, event: string, eventData: Message) {
    let buttons = [MessageBox.Action.OK]
    if (eventData.getType() === "Error")
      if (eventData.getTechnicalDetails()) {
        buttons = [MessageBox.Action.OK]
      }

    MessageBox.alert(eventData.getDescription(), {
      title: eventData.getMessage(),
      details: eventData.getAdditionalText(),
      actions: buttons,
      emphasizedAction: MessageBox.Action.OK
    })
  }

  async onGeneralMenuPress(oEvent: Event): Promise<void> {
    const oSourceControl: Control = oEvent.getSource()
    const generalMenu = await this.getGeneralMenu()
    generalMenu.openBy(oSourceControl, false)
  }

  private async getGeneralMenu() {
    const oView = this.getView()

    if (!this.generalMenu) {
      this.generalMenu = (await Fragment.load({
        id: oView.getId(),
        name: "io.camunda.connector.sap.btp.app.view.GeneralMenu",
        controller: this
      })) as Menu
      oView.addDependent(this.generalMenu)
    }
    return this.generalMenu
  }

  run(processId: string) {
    console.log(`[${this.getMetadata().getName()}] > runnning process:`, processId)
    const channelId = this.getView().getModel("AppView").getProperty("/channelId") as string
    const ws = SingletonWebSocket.getInstance(channelId)
    ws.runProcess(processId, channelId)
  }

  runThis() {
    const processId = (this.getView().byId("processName") as Input).getValue()
    this.run(processId)
    this.closeRunThisProcessDialog()
  }

  async onRunThisPress(): Promise<void> {
    const specialProcessDialog = await this.getRunThisProcessDialog()
    specialProcessDialog.open()
  }

  private async getRunThisProcessDialog() {
    const oView = this.getView()

    if (!this.runThisProcessDialog) {
      this.runThisProcessDialog = (await Fragment.load({
        id: oView.getId(),
        name: "io.camunda.connector.sap.btp.app.view.ProcessDialog",
        controller: this
      })) as Dialog
      oView.addDependent(this.runThisProcessDialog)
    }
    return this.runThisProcessDialog
  }

  closeRunThisProcessDialog(): void {
    this.runThisProcessDialog.close()
  }

  onAfterRendering(): void {
    window.setTimeout(() => {
      const urlParams = new URL(window.location.href).searchParams
      const processId = urlParams.get("run")
      const debug = urlParams.get("debug")
      const pid = urlParams.get("pid")
      const channelId = this.getView().getModel("AppView").getProperty("/channelId") as string

      ;(this.getModel("AppView") as JSONModel).setProperty("/debug", !!debug)

      // run or resume are mutually exclusive
      if (processId) {
        this.run(processId)
      } else if (pid) {
        this.resumeProcess(pid, channelId)
      }
    }, 1000)
  }

  private resumeProcess(pid: string | null, channelId: string): void {
    if (!pid) return

    fetch(`/backend/odata/v4/bpmn/UserTasks('${pid}')`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }
        return response.json()
      })
      .then((data) => {
        Log.info(`PID resume: data received: ${JSON.stringify(data)}`)

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const {
          jobKey,
          formData,
          variables
        }: {
          jobKey: string
          formData: string
          variables: string
        } = data

        SingletonWebSocket.getInstance(channelId).fireMessage({
          data: JSON.stringify({
            channelId,
            type: "form",
            jobKey,
            formData,
            variables
          })
        })
      })
      .catch((error) => {
        Log.error(`PID resume: error: ${typeof error === "object" ? JSON.stringify(error) : error}`)
      })
  }
}
