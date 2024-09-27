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

/**
 * @namespace io.camunda.connector.sap.btp.controller
 */
export default class App extends BaseController {
  public onInit(): void {}

  async onGeneralMenuPress(oEvent: Event): Promise<void> {
    const oSourceControl: Control = oEvent.getSource() as Control
    const generalMenu = await this.getGeneralMenu()
    generalMenu.openBy(oSourceControl, false)
  }

  private async getGeneralMenu() {
    const oView = this.getView()

    // create popover lazily (singleton)
    if (!this.generalMenu) {
      this.generalMenu = (await Fragment.load({
        id: oView.getId(),
        name: "io.camunda.connector.sap.btp.view.GeneralMenu",
        controller: this
      })) as Menu
      oView.addDependent(this.generalMenu)
    }
    return this.generalMenu
  }
}
