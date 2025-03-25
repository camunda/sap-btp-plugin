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
import Markdown from "./Markdown"
import { WebSocketData } from "./WebSocketData"
import CheckBox from "sap/m/CheckBox"
import DatePicker from "sap/m/DatePicker"
import Label from "sap/m/Label"
import MessageStrip from "sap/m/MessageStrip"
import RadioButton from "sap/m/RadioButton"
import TextArea from "sap/m/TextArea"
import { InputType } from "sap/m/library"
import SmartField from "sap/ui/comp/smartfield/SmartField"
import CustomData from "sap/ui/core/CustomData"
import Item from "sap/ui/core/Item"
import Filter from "sap/ui/model/Filter"
import FilterOperator from "sap/ui/model/FilterOperator"

import Lib from "sap/ui/core/Lib"

// import CheckBox from "@ui5/webcomponents/dist/CheckBox"

import { evaluate } from "feelers"
import ResourceBundle from "sap/base/i18n/ResourceBundle"
import HBox from "sap/m/HBox"
import DateTimePicker from "sap/m/DateTimePicker"
import TimePicker from "sap/m/TimePicker"
import Image from "sap/m/Image"
import HTML from "sap/ui/core/HTML"

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
        throw new Error(`working an unknown form control type ${type}`)
    }
    return value
  }


  /**
   * returns questions and answers from form streak as array
   * @returns the questions and answers as array
   */
  getUserData(): userFormData[] {
    const data: userFormData[] = []
    // for each dynamically generated cdontrol,
    // get its' "key" data for submitting -> job worker
    // and its' value that was supplied/chosen by the user
    this.generatedControls.forEach((control: { componentConfiguration: Component; type: ControlType }) => {
      const ui5Control = Core.byId(control.id) as Control

      // represents the form key as modelled in Camunda
      const key = ui5Control.getCustomData()[0].getKey()

      const value = this.getValueFromControl(control.type, ui5Control) as string
      let answer
      switch (control.type) {
        case ControlType.ValueHelpInput:
          {
            answer = (ui5Control.getAggregation("_input") as Input).getValue()
          }
          break
        case ControlType.CheckBox:
          {
            if (ui5Control.getVisible()) {
              answer = String((ui5Control as CheckBox).getSelected())
            }
          }
          break
        case ControlType.Select:
          {
            const selectedItem = (ui5Control as Select).getSelectedItem()
            if (selectedItem) {
              if (selectedItem.getText() === value) {
                answer = value
              } else {
                answer = `${value} (${selectedItem.getText()})`
              }
            }
          }
          break
        case ControlType.Radio:
          {
            const selectedButton = (ui5Control as RadioButtonGroup).getSelectedButton()
            if (selectedButton) {
              if (selectedButton.getText() === value) {
                answer = value
              } else {
                answer = `${value} (${selectedButton.getText()})`
              }
            }
          }
          break
        default: {
          answer = this.getValueFromControl(control.type, ui5Control) as string
        }
      }
      data.push({
        key,
        value,
        question: control.question as string,
        answer,
        linkedControlId: control.id,
        linkedControlType: control.type
      })
    })
    return data
  }


  /**
   * set the value state for the given control and trigger form validation afterwards
   *
   * @param control control to set the value state for
   * @param element element configuration from Camunda Form JSON, like if the control is required ...
   * @param value the new value or event value for the control or a change event
   */
  private _setValueState(control: Control, element: Component, value: string | boolean | string[] | number): void {
    const regex = element.validate?.pattern ? new RegExp(element.validate.pattern) : null
    const state =
      !value || (regex && typeof value === "string" && !regex.test(value)) ? ValueState.Error : ValueState.None

    // @ts-expect-error due to Control type not being equipped with the setters
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    control.setValueState(state)
    control.data("ValueState", state)

    setTimeout(() => this._validate(), 0)
  }

  /**
   * validate the form and set valid state in model, furthermore the valid state is returned
   *
   * @returns true, if form is validated
   */
  private _validate(): boolean {
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

  private _provideValueToView(element: Component, control: Control): void {
    ;(this.getModel(localModelName) as JSONModel).setProperty(
      `/BPMNform/${element.key}`,
      this.getValueFromControl(element.type || element.properties?.type, control) || ""
    )
  }

  private _getVisibleStatement(element: Component): boolean {
    if (!element.conditional?.hide) {
      return true
    }
    // evaluate produces a stringified boolean
    const hideResult = (evaluate(element.conditional.hide, this.getModel(localModelName).getProperty("/BPMNform/variables")) as string).toLowerCase()
    return hideResult === "false"
  }

  private _generateControlId(element: Component): string {
    return `${uid()}-${element.key}`
  }

  /**
   * additional if check, whether the control is visible or not
   *
   * @param element Camunda configuration
   * @returns whether the control is visible by another controls status or not
   */
  private _checkIfNotSet(element: Component): boolean {
    return (
      element.properties?.if &&
      element.properties?.if === "notSet" &&
      this.getModel(localModelName).getProperty(`/BPMNform/${element.key}`)
    )
  }

  private addInput(element: Component): Control {
    if (this._checkIfNotSet(element)) {
      return
    }
    const defaultValue =
      ((this.getModel(localModelName) as JSONModel).getProperty(`/BPMNform/${element.key}`) as string) ||
      this.getLocalModel().getProperty(`/BPMNform/variables/${element.key}`) ||
      (element.defaultValue as string)

    const enabled = element.disabled
    const readonly = element.readonly
      ? !!evaluate(element.readonly.toString(), this.getModel(localModelName).getProperty("/BPMNform/variables"))
      : false
    const required = element.validate?.required || false

    const control = new Input(this._generateControlId(element), {
      visible: this._getVisibleStatement(element),
      enabled: !enabled,
      editable: !readonly,
      required,
      value: defaultValue,
      valueLiveUpdate: true,
      liveChange: (event) => {
        this._provideValueToView(element, control)
        this._setValueState(control, element, event.getParameter("value"))
      }
    })

    if (element.type === ControlType.Textfield && element.validate?.pattern) {
      try {
        new RegExp(element.validate.pattern) //> throws on invalid regex
        control.attachLiveChange((event) => {
          const value = event.getParameter("value")
          const regex = new RegExp(element.validate.pattern)
          if (!regex.test(value)) {
            control.setValueState(ValueState.Error)
            control.setValueStateText(this.i18n.getText("Input.pattern_error"))
          } else {
            control.setValueState(ValueState.None)
          }
        })
      } catch (error) {
        console.error(
          `[${this.getId()}] - ${JSON.stringify(error)} - invalid regular expression in pattern: ${element.validate.pattern}`
        )
      }
    }

    if (element.validate?.validationType === "email") {
      makeEmailInput.call(this)
    }
    if (element.validate?.validationType === "phone") {
      makePhoneInput.call(this)
    }

    if (element.type === ControlType.Number) {
      makeNumberInput.call(this)
    }
    if (element.appearance?.suffixAdorner) {
      addSuffix.call(this)
    }
    if (element.appearance?.prefixAdorner) {
      return addPrefix.call(this)
    }
    if (element.validate?.min || element.validate?.max || element.validate?.minLength || element.validate?.maxLength) {
      addMinMaxValidation.call(this)
    }
    // no need to cater to Camunda Forms property "serializeToString"
    // as UI5 always gets the value from the control as string

    this._addControl(element, control, ControlType.Textfield)
    this._setValueState(control, element, control.getValue())

    return control

    function makeNumberInput(this: BPMNForm) {
      control.setType(InputType.Number)
      if (element.decimalDigits) {
        control.attachLiveChange((event) => {
          const value = event.getParameter("value")
          const regex = new RegExp(`^-?\\d*[.,]?\\d{0,${element.decimalDigits}}$`)
          if (!regex.test(value)) {
            control.setValueState(ValueState.Error)
            control.setValueStateText(this.i18n.getText("NumberInput.decimal_digits_error", [element.decimalDigits]))
          } else {
            control.setValueState(ValueState.None)
          }
        })
      }
    }

    function makePhoneInput(this: BPMNForm) {
      control.setType(InputType.Tel)
      control.attachLiveChange((event) => {
        const value = event.getParameter("value")
        const regex = new RegExp(/^(\+?\d{1,3}[-.\s]*)?(\(?\d{1,4}\)?[-.\s]*){2,3}\d{1,4}$/)
        if (!regex.test(value)) {
          control.setValueState(ValueState.Error)
          control.setValueStateText(this.i18n.getText("PhoneInput.error"))
        } else {
          control.setValueState(ValueState.None)
        }
      })
    }

    function makeEmailInput(this: BPMNForm) {
      control.setType(InputType.Email)
      control.attachLiveChange((event) => {
        const value = event.getParameter("value")
        const regex = new RegExp(
          `^((\\.?[^<>()\\[\\]\\.,;:\\s@"]+(\\.[^<>()\\[\\]\\.,;:\\s@"]+)*)|(".+"))@((\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}])|(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))$`
        )
        if (!regex.test(value)) {
          control.setValueState(ValueState.Error)
          control.setValueStateText(this.i18n.getText("EmailInput.error"))
        } else {
          control.setValueState(ValueState.None)
        }
      })
    }

    function addMinMaxValidation(this: BPMNForm) {
      control.attachLiveChange((event) => {
        const charCount = event.getParameter("value").length || 0
        const min = element.validate.min || element.validate.minLength
        const max = element.validate.max || element.validate.maxLength
        if (min && charCount < min) {
          control.setValueState(ValueState.Error)
          control.setValueStateText(this.i18n.getText("Input.min_length_error", [min]))
        } else if (max && charCount > max) {
          control.setValueState(ValueState.Error)
          control.setValueStateText(this.i18n.getText("Input.max_length_error", [max]))
        } else {
          control.setValueState(ValueState.None)
        }
      })
    }

    // for the sake of structure
    function addPrefix(this: BPMNForm) {
      const label = new Label({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        text: evaluate(
          element.appearance.prefixAdorner.toString(),
          this.getModel(localModelName).getProperty("/BPMNform/variables")
        ),
        labelFor: control.getId()
      }).addStyleClass("sapUiTinyMarginEnd")
      const hbox = new HBox({ alignItems: "Center" }).addItem(label).addItem(control)

      const fn = hbox.setVisible
      hbox.setVisible = (value) => {
        fn.apply(control, [value])
        if (control.getVisible() === false) {
          if (element.validate?.required) {
            control.setValueState(ValueState.Error)
          }
          control.setValue("")
          this._provideValueToView(element, control)
        }
        return control
      }
      this._addControl(element, hbox, ControlType.Textfield)
      this._setValueState(control, element, control.getValue())

      return control
    }

    function addSuffix() {
      control.setDescription(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call
        evaluate(
          element.appearance.suffixAdorner.toString(),
          this.getModel(localModelName).getProperty("/BPMNform/variables")
        )
      )
    }
  }

  private addCheckbox(element: Component): Control {
    if (this._checkIfNotSet(element)) {
      return
    }

    const selected =
      (this.getModel(localModelName) as JSONModel).getProperty(`/BPMNform/${element.key}`) ||
      this.getLocalModel().getProperty(`/BPMNform/variables/${element.key}`) ||
      element.defaultValue

    const enabled = element.disabled
    const readonly = element.readonly

    const visible = this._getVisibleStatement(element)
    const control = new CheckBox(this._generateControlId(element), {
      visible,
      selected,
      enabled: !enabled, 
      editable: !readonly,
      text: element.label,
      select: () => {
        this._provideValueToView(element, control)
        this._validate()
      }
    })

    this._provideValueToView(element, control)
    this._addControl(element, control, ControlType.CheckBox, false)
    this._validate()

    return control
  }

  private getDynamicFiltersFromCamundaProperties(element: Component): Filter[] {
    const filters: Filter[] = []
    Object.keys(element.properties)
      .filter((property) => property.indexOf("filter") === 0)
      .forEach((property: string) => {
        const regex = /(.*){(.*)}/
        const value = element.properties[property].replace(regex, (total: string, a: string, b: string) => {
          b = this.getModel(localModelName).getProperty(`/BPMNform/${b}`)
          return `${a}${b}`
        })

        let [path, operator, value1] = value.split(",")
        if (value1 === "true") {
          value1 = true
        }
        if (value1 === "false") {
          value1 = false
        }
        filters.push(
          new Filter({
            path,
            value1,
            operator: FilterOperator[operator as String]
          })
        )
      })
    return filters
  }

  private addSelect(element: Component): Control {
    if (this._checkIfNotSet(element)) {
      return
    }

    const visible = this._getVisibleStatement(element)

    const control = new Select(this._generateControlId(element), {
      visible: visible,
      selectedKey:
        (this.getModel(localModelName) as JSONModel).getProperty(`/BPMNform/${element.key}`) ||
        this.getLocalModel().getProperty(`/BPMNform/variables/${element.key}`) ||
        element.defaultValue,
      forceSelection: false,
      change: (event) => {
        this._provideValueToView(element, control)
        this._setValueState(control, element, event.getParameter("selectedItem")?.getKey() as string)
      }
    })

    element.values?.forEach((value) => {
      control.addItem(new Item({ key: value.value, text: value.label }))
    })

    this._addControl(element, control, ControlType.Select)
    this._setValueState(control, element, !!control.getSelectedKey() || false)

    return control
  }

  private addRadioGroup(element: Component): Control {
    if (this._checkIfNotSet(element)) {
      return
    }

    const enabled = element.disabled
    const readonly = element.readonly

    const control = new RadioButtonGroup(this._generateControlId(element), {
      enabled: !enabled,
      editable: !readonly,
      visible: this._getVisibleStatement(element),
      select: () => {
        control.setValueState(ValueState.None)
        this._provideValueToView(element, control)
        this._validate()
      },
      columns: element.values?.length > 2 ? 1 : 2
    })

    const defaultValue =
      ((this.getModel(localModelName) as JSONModel).getProperty(`/BPMNform/${element.key}`) as string) ||
      this.getLocalModel().getProperty(`/BPMNform/variables/${element.key}`) ||
      element.defaultValue

    let selectedIndex = -1
    element.values?.forEach((value, index) => {
      const radioButton = new RadioButton(`${this._generateControlId(element)}-${index}`, { text: value.label })
      // attach a pseudo-"key" to the radio button for later data retrieval
      radioButton.addCustomData(new CustomData({ key: value.value, value: value.value }))
      if (value.value === defaultValue) {
        selectedIndex = index
      }
      control.addButton(radioButton)
    })

    control.setSelectedIndex(selectedIndex)

    this._provideValueToView(element, control)

    if (element.validate?.required && (!defaultValue || defaultValue === "<none>")) {
      control.setValueState(ValueState.Error)
    }

    this._addControl(element, control, ControlType.Radio)

    this._validate()

    return control
  }

  private addDateTime(element: Component): Control {
    if (this._checkIfNotSet(element)) {
      return
    }

    let control: Control
    if (element.subtype && element.subtype === "date") {
      control = new DatePicker(this._generateControlId(element), {
        visible: this._getVisibleStatement(element),
        valueFormat: "yyyy-MM-dd",
        displayFormat: "yyyy-MM-dd"
      })
      if (element.disallowPassedDates) {
        ;(control as DatePicker).setMinDate(new Date())
      }
    } else if (element.subtype && element.subtype === "time") {
      control = new TimePicker(this._generateControlId(element), {
        visible: this._getVisibleStatement(element),
        support2400: element.use24h,
        valueFormat: element.use24h ? "HH:mm:ss" : "hh:mm:ss aa",
        displayFormat: element.use24h ? "HH:mm:ss" : "hh:mm:ss aa",
        showCurrentTimeButton: true
      })
    } else if (element.subtype && element.subtype === "datetime") {
      control = new DateTimePicker(this._generateControlId(element), {
        visible: this._getVisibleStatement(element),
        valueFormat: element.use24h ? "yyyy-MM-ddTHH:mm:ss" : "yyyy-MM-ddThh:mm:ss aa",
        displayFormat: element.use24h ? "yyyy-MM-ddTHH:mm:ss" : "yyyy-MM-ddThh:mm:ss aa",
        showCurrentTimeButton: true
      })
    } else {
      throw new Error(`Unknown datetune subtype ${element.subtype}`)
    }

    const readonly = element.readonly
      ? !!evaluate(element.readonly.toString(), this.getModel(localModelName).getProperty("/BPMNform/variables"))
      : false
    const required = element.validate?.required || false

    // @ts-expect-error due to Control type not being equipped with the setters
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    control.setEnabled(!element.disabled).setEditable(!readonly).setRequired(required)
    control.attachChange((event: Event) => {
      this._setValueState(control, element, event.getParameter("valid") as boolean)
      this._provideValueToView(element, control)
    })

    this._addControl(element, control, ControlType.DatePicker)
    this._setValueState(control, element, !element.validate?.required)

    return control
  }

  private addSmartField(element: Component, currentPath?: string): Control {
    if (this._checkIfNotSet(element)) {
      return
    }

    // check mandatory fields for this type
    if (!element.properties.type || !element.properties.fieldName) {
      this.addItem(
        new MessageStrip({
          text: "Mandatory fields for this control type missing.",
          type: "Warning",
          showIcon: "true"
        })
      )
      return
    }

    const oModel = this.getModel() as ODataModel
    const vhContext = oModel.createEntry("/ValueHelpSet", {
      properties: {
        Id: `${element.key}`
      }
    })

    const control = new SmartField({
      value: `{${element.properties.fieldName}}`
    })
    control.bindElement(vhContext.getPath())

    this._addControl(element, control, ControlType.SmartField)

    return control
  }

  private getStaticFiltersFromCamundaProperties(element: Component): object {
    const filterProperties = {}
    Object.keys(element.properties)
      .filter((property) => property.indexOf("filter") === 0)
      .forEach((property: string) => {
        const regex = /(.*){(.*)}/
        const value = element.properties[property].replace(regex, (total: string, a: string, b: string) => {
          b = this.getModel(localModelName).getProperty(`/BPMNform/${b}`)
          return `${a}${b}`
        })
        filterProperties[property] = value
      })
    return filterProperties
  }

  private mandatoryFieldCheck(mandatoryProperties: string[], element: Component) {
    const missingFields = mandatoryProperties.filter((value: string) => !element.properties[value])
    if (missingFields.length) {
      console.error(
        `Error 1670402621: missing mandatory field(s) "${missingFields.join(",")}" for ${JSON.stringify(element)}`
      )
    }
    return missingFields.length === 0
  }

  private addSuggestInput(element: Component, currentPath?: string) {
    element.properties.enableSuggestion = true
    element.properties.showDialog = false

    // this.addValueHelpInput(element, currentPath?: string)
  }

  private resolveVariables(property: string): string {
    return property.replace(/(.*){(.*)}(.*)/gm, (total: string, a: string, b: string, c: string) => {
      const value = this.getModel(localModelName).getProperty(`/BPMNform/${b}`)
      return `${a}${value}${c}`
    })
  }

  private addText(element: Component) {
    const visible = this._getVisibleStatement(element)
    let content = element.text
    content = evaluate(content, this.getModel(localModelName).getProperty("/BPMNform/variables"))
    const text = new Markdown(`${uid()}-markdown`, {
      content: content.replace(/\{/gm, `\{${localModelName}>/BPMNform/`),
      visible: visible
    }) as Control
    this._addControl(element, text, ControlType.Text, false, false, true)
  }

  private _addControl(
    element: Component,
    control: Control,
    controlType: ControlType,
    showLabel = true,
    keepTrack = true,
    noMargin = false
  ) {
    const visible = this._getVisibleStatement(element)
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

  private generateLabelFromElement(element: Component): string {
    return element.description ? `${element.label} (${element.description})` : element.label
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
    return this.getModel(localModelName) as JSONModel
  }

  _updateFormVariables(variables: { [index: string]: string }): void {
    for (const key in variables) {
      this.getLocalModel().setProperty(`/BPMNform/variables/${key}`, variables[key])
    }
  }

  addDynamicList(element: any) {
    const subPathInModel = element.path.replaceAll(".", "/")
    const arr = this.getLocalModel().getProperty(`/BPMNform/${subPathInModel}`) ?? []
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions, @typescript-eslint/no-unsafe-member-access
    arr.length === 0 &&
      console.warn(`[${this.getMetadata().getName()}] - data path ${element.path} doesn't hold data in view model!`)
    // fix the key to enable UI5 binding
    arr.forEach(() => this._generateControls(element.components, subPathInModel))
    // console.log("//> rendering:", element)
    //throw new Error("Method not implemented.")
  }

  addTextArea(element: Component) {
    const defaultValue =
      this.getLocalModel().getProperty(`/BPMNform/${element.key}`) ||
      this.getLocalModel().getProperty(`/BPMNform/variables/${element.key}`) ||
      element.defaultValue

    const enabled = element.disabled
    const readonly = element.readonly
      ? // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        !!evaluate(element.readonly.toString(), this.getModel(localModelName).getProperty("/BPMNform/variables"))
      : false
    const required = element.validate?.required || false

    const control = new TextArea(this._generateControlId(element), {
      visible: this._getVisibleStatement(element),
      value: defaultValue,
      enabled: !enabled,
      editable: !readonly,
      required,
      cols: 50,
      rows: 20
    })

    this._addControl(element, control, ControlType.Textarea)
    this._setValueState(control, element, control.getValue())

    return control
  }

  _generateControls(components: Component[]): void {
    components.forEach((element) => {
      switch (element.type) {
        case ControlType.HTML:
          this.addHTML(element)
          break
        case ControlType.Image:
          this.addImage(element)
          break
        case ControlType.DatePicker:
          this.addDateTime(element)
          break
        case ControlType.Textarea:
          this.addTextArea(element)
          break
        case ControlType.DynamicList:
          this.addDynamicList(element) //> only provides the current path, never receives
          break
        case ControlType.Textfield:
        case ControlType.Number:
          this.addInput(element)
          break
        case ControlType.Select:
          this.addSelect(element)
          break
        case ControlType.CheckBox:
          this.addCheckbox(element)
          break
        case ControlType.Radio:
          this.addRadioGroup(element)
          break
        case ControlType.Text:
          this.addText(element)
          break
        default:
          console.error(`Error 1650472412: Unsupported control type "${element.type}"`)
          break
      }
    })
  }
  addHTML(element: Component) {
    const content = evaluate(
      element.content.toString(),
      this.getModel(localModelName).getProperty("/BPMNform/variables")
    )
    const control = new HTML(this._generateControlId(element), {
      visible: this._getVisibleStatement(element),
      content,
      sanitizeContent: true,
      preferDOM: false
    })
    this._addControl(element, control, ControlType.HTML)

    return control
  }
  addImage(element: Component) {
    const control = new Image(this._generateControlId(element), {
      visible: this._getVisibleStatement(element),
      src: element.source,
      alt: element.alt
    })

    this._addControl(element, control, ControlType.Image)

    return control
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
}
