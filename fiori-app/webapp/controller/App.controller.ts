import Core from "sap/ui/core/Core"
import BaseController from "./BaseController"
import JSONModel from "sap/ui/model/json/JSONModel"
import Fragment from "sap/ui/core/Fragment"
import MessagePopover from "sap/m/MessagePopover"
import Event from "sap/ui/base/Event"
import Control from "sap/ui/core/Control"
import MessageManager from "sap/ui/core/message/MessageManager"
import Message from "sap/ui/core/message/Message"
import Menu from "sap/m/Menu"
import UriParameters from "sap/base/util/UriParameters"
import Dialog from "sap/m/Dialog"
import { LayoutType } from "sap/f/library"
import FlexibleColumnLayout from "sap/f/FlexibleColumnLayout"
import Button from "sap/m/Button"
import SingletonWebSocket from "../util/WebSocket"
import MessageBox, { Action } from "sap/m/MessageBox"
import { URLHelper } from "sap/m/library"
import ResourceModel from "sap/ui/model/resource/ResourceModel"
import Input from "sap/m/Input"

/**
 * @namespace io.camunda.connector.sap.btp.app.controller
 */
export default class App extends BaseController {
  private generalMenu: Menu
  private runThisProcessDialog: Dialog

  public onInit(): void {}

  async onGeneralMenuPress(oEvent: Event): Promise<void> {
    const oSourceControl: Control = oEvent.getSource()
    const generalMenu = await this.getGeneralMenu()
    generalMenu.openBy(oSourceControl, false)
  }

  private async getGeneralMenu() {
    const oView = this.getView()

    // create popover lazily (singleton)
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
    console.log(`[${this.getMetadata().getName()}] - runnning process:`, processId)
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

    // create popover lazily (singleton)
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
