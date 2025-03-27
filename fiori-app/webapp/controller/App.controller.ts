import Dialog from "sap/m/Dialog"
import Input from "sap/m/Input"
import Menu from "sap/m/Menu"
import MessageBox, { Action } from "sap/m/MessageBox"
import Event from "sap/ui/base/Event"
import Control from "sap/ui/core/Control"
import EventBus from "sap/ui/core/EventBus"
import Fragment from "sap/ui/core/Fragment"
import Message from "sap/ui/core/message/Message"
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
}
