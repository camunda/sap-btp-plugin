/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import uid from "sap/base/util/uid"
import Input from "sap/m/Input"
import MultiComboBox from "sap/m/MultiComboBox"
import RadioButtonGroup from "sap/m/RadioButtonGroup"
import Select from "sap/m/Select"
import VBox from "sap/m/VBox"
import Control from "sap/ui/core/Control"
import Core from "sap/ui/core/Core"
import type { MetadataOptions } from "sap/ui/core/Element"
import EventBus from "sap/ui/core/EventBus"
import { ValueState } from "sap/ui/core/library"
import JSONModel from "sap/ui/model/json/JSONModel"
import BPMNFormRenderer from "./BPMNFormRenderer"
import { BPMNformData, Component, ControlType, GeneratedControl } from "./BPMNformData"
import CheckBox from "sap/m/CheckBox"
// postpone webc usage
// import CheckBox from "@ui5/webcomponents/dist/CheckBox"
import Label from "sap/m/Label"
import TextArea from "sap/m/TextArea"
import CustomData from "sap/ui/core/CustomData"
import { WebSocketData } from "./WebSocketData"

import Lib from "sap/ui/core/Lib"


import { evaluate } from "feelers"
import ResourceBundle from "sap/base/i18n/ResourceBundle"
import {
  addCheckbox,
  addDateTime,
  addHTML,
  addImage,
  addInput,
  addRadioGroup,
  addSelect,
  addText,
  addTextArea
} from "./creations/index"

// name of local json model used for local bindings
const localModelName = uid()

/**
 * Constructor for a new <code>io.camunda.connector.sap.btp.lib.BPMNForm</code> control.
 *
 * Some class description goes here.
 * @extends Control
 *
 * @constructor
 * @public
 * @name io.camunda.connector.sap.btp.lib.BPMNForm
 */
export default class BPMNForm extends Control {
  // The following three lines were generated and should remain as-is to make TypeScript aware of the constructor signatures
  constructor(id?: string | $BPMNFormSettings)
  constructor(id?: string, settings?: $BPMNFormSettings)
  constructor(id?: string, settings?: $BPMNFormSettings) {
    super(id, settings)
  }

  i18n: ResourceBundle
  static renderer: typeof BPMNFormRenderer = BPMNFormRenderer
  private generatedControls: GeneratedControl[] = []
  localModelName = localModelName

  static readonly metadata: MetadataOptions = {
    library: "io.camunda.connector.sap.btp.lib",
    properties: {
      buttonText: { type: "string", defaultValue: "submit me!" },
      placeHolderText: { type: "string", defaultValue: "waiting for data..." },
      submitButtonVisible: { type: "boolean", defaultValue: true },
      valid: { type: "boolean", bindable: true },
      formStep: { type: "int", bindable: true }
    },
    aggregations: {
      items: { type: "sap.ui.core.Control", multiple: true }
    },
    events: {
      // fired, when form has been filled completely and summary is shown
      summary: {},
      // fired, when summary is dismissed by finish button
      finishedForm: {}
    }
  }

  getValueFromControl(type: ControlType, control: Control): boolean | string | string[] {
    let value: boolean | string | string[]

    switch (type) {
      case ControlType.Textarea:
        value = (control as TextArea).getValue()
        break
      case ControlType.Number:
      case ControlType.DatePicker:
      case ControlType.Textfield:
      case ControlType.ValueHelpInput:
        value = (control as Input).getValue()
        break
      case ControlType.DynamicSumAutomatic:
        value = (control as MultiComboBox).getSelectedKeys()
        break
      case ControlType.Select:
        value = (control as Select).getSelectedKey()
        break

      case ControlType.Radio: {
        const selectedButton = (control as RadioButtonGroup).getSelectedButton()
        if (selectedButton) {
          value = selectedButton.getCustomData()[0].getKey()
        } else {
          value = ""
        }
        break
      }
      case ControlType.CheckBox:
        if (control && (control as CheckBox).getVisible()) {
          value = (control as CheckBox).getSelected()
        } else {
          value = ""
        }
        break
      case ControlType.Text:
        break
      default:
        console.error(`[${this.getId()}] - working an unknown form control type ${type}`)
        throw new Error(`${this.getId()}: working an unknown form control type ${type}`)
    }
    return value
  }

  /**
   * set the value state for the given control and trigger form validation afterwards
   *
   * @param control control to set the value state for
   * @param element element configuration from Camunda Form JSON, like if the control is required ...
   * @param value the new value or event value for the control or a change event
   */
   setValueState(control: Control, element: Component, value: string | boolean | string[] | number): void {
    const regex = element.validate?.pattern ? new RegExp(element.validate.pattern) : null
    const state =
      !value || (regex && typeof value === "string" && !regex.test(value)) ? ValueState.Error : ValueState.None

    // @ts-expect-error due to Control type not being equipped with the setters
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    control.setValueState(state)
    control.data("ValueState", state)

    setTimeout(() => this.validate(), 0)
  }

  /**
   * validate the form and set valid state in model, furthermore the valid state is returned
   *
   * @returns true, if form is validated
   */
   validate(): boolean {
    return true
    const invalidControls = this.generatedControls.filter((generatedControl: GeneratedControl) => {
      let valid = true
      const control = Core.byId(generatedControl.id) as Control
      let valueState = control.data("ValueState") as string
      if (!valueState) {
        valueState = control.getValueState ? control.getValueState() : false
      }
      if (valueState !== ValueState.None && control.getVisible()) {
        valid = false
      }
      return !valid
    })
    this.setValid(!invalidControls.length)
    return !invalidControls.length
  }

   provideValueToView(element: Component, control: Control): void {
    ;(this.getModel(localModelName) as JSONModel).setProperty(
      `/BPMNform/${element.key}`,
      this.getValueFromControl(element.type || element.properties?.type, control) || ""
    )
  }

  getVisibleStatement(element: Component): boolean {
    if (!element.conditional?.hide) {
      return true
    }
    // evaluate produces a stringified boolean
    const hideResult = (
      evaluate(element.conditional.hide, this.getModel(localModelName).getProperty("/BPMNform/variables")) as string
    ).toLowerCase()
    return hideResult === "false"
  }

  generateControlId(element: Component): string {
    return `${uid()}-${element.key}`
  }

  init(): void {
    console.debug(`[${this.getMetadata().getName()}] > init`)

    this.i18n = Lib.getResourceBundleFor("io.camunda.connector.sap.btp.lib")

    this._initLocalModel()

    EventBus.getInstance().subscribe("Camunda", "startProcess", () => {
      this._initLocalModel()
    })
  }

  _initLocalModel() {
    console.debug(`[${this.getMetadata().getName()}] > local BPMN form model: ${localModelName}`)
    const data = {
      BPMNform: {
        variables: {}
      }
    }
    const localModel = this.getModel(localModelName) as JSONModel
    if (!localModel) {
      this.setModel(new JSONModel(data), localModelName)
    } else if (Object.keys((localModel.getProperty("/BPMNform/variables") as object) || {}).length === 0) {
      localModel.setData(data)
    }
    if (
      this.getModel("AppView") &&
      Object.keys((this.getModel("AppView").getProperty("/BPMNform") as object) || {}).length > 0
    ) {
      localModel.setProperty("/BPMNform", this.getModel("AppView").getProperty("/BPMNform"))
    }
  }

  endProcess(data: WebSocketData): void {
    this.fireEvent("summary")

    // // layout container
    // const container = new HBox({
    //   width: "100%"
    // })
    // container.addStyleClass("sapUiResponsiveMargin")
    // container.setAlignItems("Center")

    // const content = new VBox({
    //   width: "100%"
    // })
    // content.addStyleClass("sapUiResponsiveMargin")

    // if (data.type === "final-task-success") {
    //   content.addItem(new Title({ text: this.getFinalResultTextSuccess(), level: "H1", wrapping: true }))
    // }
    // if (data.type === "final-task-fail") {
    //   const h1 = new Title({ text: this.getFinalResultTextFail(), level: "H1", wrapping: true })
    //   h1.addStyleClass("sapUiSmallMarginBegin")
    //   const title = new HBox({
    //     items: [
    //       new Icon({
    //         src: "sap-icon://alert",
    //         color: "red"
    //       }),
    //       h1
    //     ]
    //   })
    //   content.addItem(title)
    // }

    // container.addItem(content)
    // container.data("controlType", ControlType.Summary)

    // this.addItem(container)

    // clear the form model
    this._initLocalModel()
  }

  processVariables(data: WebSocketData): void {
    // populate local model with variables from server for use in UI conditions
    this._updateFormVariables(data.variables)
  }

  /**
   * transform the data received by a websocket
   * that holds a form modelled as part of a "user task"
   * into a ui5 form
   *
   * @param jsonString received data via websocket
   */
  processForm(data: WebSocketData): void {
    const formData = JSON.parse(data.formData) as BPMNformData

    // populate local model with variables from server for use in UI conditions
    this._updateFormVariables(data.variables)

    // create controls and add to stage
    this._generateControls(formData.components)
  }

  getLocalModel(): JSONModel {
    return this.getModel(this.localModelName) as JSONModel
  }

  _updateFormVariables(variables: { [index: string]: string }): void {
    for (const key in variables) {
      this.getLocalModel().setProperty(`/BPMNform/variables/${key}`, variables[key])
    }
  }

  reset(): void {
    this.generatedControls = []
    this.removeAllItems()
  }

  onBeforeRendering(): void {
    console.debug(`[${this.getMetadata().getName()}] > onBeforeRendering`)
  }

  onAfterRendering(): void {
    console.debug(`[${this.getMetadata().getName()}] > onAfterRendering`)
  }

  private generateLabelFromElement(element: Component): string {
    return element.description ? `${element.label} (${element.description})` : element.label
  }

  public addControl(
    element: Component,
    control: Control,
    controlType: ControlType,
    showLabel = true,
    keepTrack = true,
    noMargin = false
  ) {
    const visible = this.getVisibleStatement(element)
    const id = control.getId()
    const title = this.generateLabelFromElement(element)

    if (keepTrack) {
      // keep track of generated control for later value retrieval
      this.generatedControls.push({ id, type: controlType, componentConfiguration: element, question: title })
    }

    const vbox = new VBox({
      visible: visible
    })
    vbox.addStyleClass("wordBreak")
    if (noMargin) {
      vbox.addStyleClass("sapUiNoMarginTop")
      vbox.addStyleClass("sapUiNoMarginBottom")
    }

    control.addCustomData(new CustomData({ key: element.key, value: element.key }))

    if (showLabel) {
      vbox.addItem(
        new Label({
          visible: visible,
          text: title,
          labelFor: id,
          required: element.validate?.required,
          wrapping: true
        })
      )
    }

    vbox.addItem(control).addStyleClass("sapUiResponsiveMargin")
    vbox.data("control", control)
    vbox.data("controlType", controlType)
    vbox.data("element", element)

    this.addItem(vbox)
  }

  _generateControls(components: Component[]): void {
    components.forEach((element) => {
      switch (element.type) {
        case ControlType.HTML:
          addHTML.call(this, element)
          break
        case ControlType.Image:
          addImage.call(this, element)
          break
        case ControlType.DatePicker:
          addDateTime.call(this, element)
          break
        case ControlType.Textarea:
          addTextArea.call(this, element)
          break
        case ControlType.Textfield:
        case ControlType.Number:
          addInput.call(this, element)
          break
        case ControlType.Select:
          addSelect.call(this, element)
          break
        case ControlType.CheckBox:
          addCheckbox.call(this, element)
          break
        case ControlType.Radio:
          addRadioGroup.call(this, element)
          break
        case ControlType.Text:
          addText.call(this, element)
          break
        default:
          console.error(`Error ${this.getId()}: Unsupported control type "${element.type}"`)
          break
      }
    })
  }

  getUserData(): userFormData[] {
    return [] as userFormData[]
  }
}
