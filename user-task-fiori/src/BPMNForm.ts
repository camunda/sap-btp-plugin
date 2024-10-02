/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/*!
 * ${copyright}
 */
import Markdown from "./Markdown"
import Control from "sap/ui/core/Control"
import type { MetadataOptions } from "sap/ui/core/Element"
import BPMNFormRenderer from "./BPMNFormRenderer"
import { Component, ControlType, GeneratedControl, SelectionModes } from "./BPMNformData"
import Core from "sap/ui/core/Core"
import { ValueState } from "sap/ui/core/library"
import JSONModel from "sap/ui/model/json/JSONModel"
import uid from "sap/base/util/uid"
import VBox from "sap/m/VBox"
import { WebSocketData } from "./WebSocketData"
import HBox from "sap/m/HBox"
import Title from "sap/m/Title"
import EventBus from "sap/ui/core/EventBus"
import Input from "sap/m/Input"
import MultiComboBox from "sap/m/MultiComboBox"
import Select from "sap/m/Select"
import RadioButtonGroup from "sap/m/RadioButtonGroup"
import CheckBox from "sap/m/CheckBox"
import { InputType } from "sap/m/library"
import Sorter from "sap/ui/model/Sorter"
import Item from "sap/ui/core/Item"
import Filter from "sap/ui/model/Filter"
import FilterOperator from "sap/ui/model/FilterOperator"
import SelectList from "sap/m/SelectList"
import RadioButton from "sap/m/RadioButton"
import CustomData from "sap/ui/core/CustomData"
import DatePicker from "sap/m/DatePicker"
import MessageStrip from "sap/m/MessageStrip"
import SmartField from "sap/ui/comp/smartfield/SmartField"

// import { ExampleColor } from "./library";

// name of local json model used for local bindings
const localModelName = uid()

/**
 * Constructor for a new <code>io.camunda.connector.sap.btp.lib.BPMNForm</code> control.
 *
 * Some class description goes here.
 * @extends Control
 *
 * @author Volker Buzek
 * @version ${version}
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

  static readonly metadata: MetadataOptions = {
    library: "io.camunda.connector.sap.btp.lib",
    properties: {
      buttonText: { type: "string", defaultValue: "submit me!" },
      placeHolderText: { type: "string", defaultValue: "waiting for data..." },
      finalResultTextSuccess: { type: "string", defaultValue: "final result!" },
      finalResultTextFail: { type: "string", defaultValue: "final result failed!" },
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

  static renderer: typeof BPMNFormRenderer = BPMNFormRenderer

  private generatedControls: GeneratedControl[] = []

  /**
   * get correct value from various controls
   * if input, get value, if select, get selectedKey,...
   * @param type type of control to fetch value from
   * @param control control itself
   * @returns The extracted value from control
   */
  getValueFromControl(type: ControlType, control: Control): boolean | string | string[] {
    let value: boolean | string | string[]

    switch (type) {
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
   * set the value state for the given control and trigger form validation afterwards
   *
   * @param control control to set the value state for
   * @param element elemente configuration from camunda, like if the control is required ...
   * @param value the new value for the control
   */
  private _setValueState(control: Control, element: Component, value: string | boolean | string[] | number): void {
    let regex = element.validate?.pattern ? new RegExp(element.validate?.pattern) : undefined

    if (element.validate?.required && !value) {
      control.setValueState(ValueState.Error)
    } else {
      const min = element.validate?.minLength ?? 0
      const max = element.validate?.maxLength ?? ""
      if (!element.validate?.pattern && (min || max)) {
        regex = new RegExp(`^.{${min},${max}}$`)
      }

      if (regex && !!value) {
        if (typeof value === "string" && regex.test(value)) {
          control.setValueState(ValueState.None)
          control.data("ValueState", ValueState.None)
        } else {
          control.setValueState(ValueState.Error)
          control.data("ValueState", ValueState.Error)
        }
      } else {
        control.setValueState(ValueState.None)
        control.data("ValueState", ValueState.None)
      }
    }
    window.setTimeout(() => {
      this._validate()
    }, 0)
  }

  /**
   * validate the form and set valid state in model, furthermore the valid state is returned
   *
   * @returns true, if form is validated
   */
  private _validate(): boolean {
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

  /**
   * fetches value from control and provides it to control json model
   *
   * @param element camunda configuration
   * @param control ui5 control
   */
  private _provideValueToView(element: Component, control: Control): void {
    ;(this.getModel(localModelName) as JSONModel).setProperty(
      `/BPMNform/${element.key}`,
      this.getValueFromControl(element.type || element.properties?.type, control) || ""
    )
  }

  /**
   * generate visible statement of control depending of the given camunda element
   * configuration
   *
   * @param element camunda configuration
   * @returns visible statement as expression binding or a boolean
   */
  private _getVisibleStatement(element: Component): boolean | `{${string}}` {
    let visible = false

    if (!element.properties?.if) {
      visible = true
    } else {
      if (element.properties?.if && element.properties?.if === "notSet") {
        visible = true
      } else {
        visible = "{= " + element.properties?.if.replace(/\{/gm, `\${${localModelName}>/BPMNform/`) + "}"
      }
    }
    return visible
  }

  /**
   * generate a unique id of control based on key in camunda and a randomly generated string prepended
   * each controls id should be generated by this function for better usage with wdi5
   *
   * @param element Camunda control configuration
   * @returns the generated id
   */
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

  /**
   * add textfield control, register it and bind validation
   * @param element the component configuration from camunda
   *
   * @return the created and addded control
   */
  private addTextfield(element: Component): Control {
    if (this._checkIfNotSet(element)) {
      return
    }

    const defaultValue =
      ((this.getModel(localModelName) as JSONModel).getProperty(`/BPMNform/${element.key}`) as string) ||
      (element.defaultValue as string)

    const control = new Input(this._generateControlId(element), {
      visible: this._getVisibleStatement(element),
      value: defaultValue,
      valueLiveUpdate: true,
      liveChange: (event) => {
        this._provideValueToView(element, control)
        this._setValueState(control, element, event.getParameter("value"))
      }
    })

    // handle visibility for deep if constructions,
    // if the control is set to invisible delete value and provide empty value
    // to local model to hide dependent controls as well
    const fn = control.setVisible
    control.setVisible = (value) => {
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
    if (element.type === ControlType.Number) {
      control.setType(InputType.Number)
    }
    this._addControl(element, control, ControlType.Textfield)
    this._setValueState(control, element, control.getValue())

    return control
  }

  /**
   * add select control, register it and bind validation
   * @param element the component configuration from camunda
   *
   * @return the created and addded control
   */
  private addDynamicSumAutomatic(element: Component): Control {
    if (this._checkIfNotSet(element)) {
      return
    }

    const visible = this._getVisibleStatement(element)

    const control = new MultiComboBox(this._generateControlId(element), {
      visible: visible,
      selectionChange: (event) => {
        this._provideValueToView(element, control)
        this._setValueState(control, element, event.getSource().getSelectedKeys().length)
      }
    })

    // hardcoded values or dynmic (json or odata)?
    if (!this.mandatoryFieldCheck(["service", "key", "display"], element)) {
      return
    }

    const displayElements = element.properties?.display.split(",")
    const prefix = element.properties.service ? element.properties.service + ">" : ""
    let display = `{${prefix}${displayElements[0]}}`
    if (displayElements.length > 1) {
      display = `{${prefix}${displayElements[0]}} - {${prefix}${displayElements[1]}}`
    }
    const regex = /(.*){(.*)}(.*)/gm
    element.properties.for = element.properties.for.replace(regex, (total: string, a: string, b: string, c: string) => {
      const value = this.getModel(localModelName).getProperty(`/BPMNform/${b}`)
      return `${a}${value}${c}`
    })

    // get all filter properties in camunda
    const filters = this.getDynamicFiltersFromCamundaProperties(element)
    let sorter

    if (element.properties?.sorter) {
      const sorterProperties = element.properties?.sorter.split(",")
      const desc = sorterProperties[1] === "DESC" ? true : false
      sorter = [new Sorter(sorterProperties[0], desc)]
    }

    control.bindAggregation("items", {
      path: `${prefix}/${element.properties.for}`,
      filters: filters ? filters : undefined,
      sorter: sorter,
      template: new Item({
        key: `{${prefix}${element.properties.key}}`,
        text: display
      })
    })

    this._addControl(element, control, ControlType.DynamicSumAutomatic)
    this._setValueState(control, element, undefined)
    this._validate()
  }

  // /**
  //  * add textfield control, register it and bind validation
  //  * @param element the component configuration from camunda
  //  *
  //  * @return the created and addded control
  //  */
  // private addDynamicSum(element: Component): Control {
  //   if (this._checkIfNotSet(element)) {
  //     return
  //   }
  //   let mandatoryFields: string[] = []

  //   switch (element.properties.selectionMode) {
  //     case SelectionModes.select:
  //       {
  //         mandatoryFields = ["type", "for", "key", "display"]
  //       }
  //       break
  //     case SelectionModes.valuehelp:
  //     default: {
  //       mandatoryFields = ["type", "for", "display", "suggestFields"]
  //     }
  //   }
  //   if (!this.mandatoryFieldCheck(mandatoryFields, element)) {
  //     return
  //   }

  //   const visible = this._getVisibleStatement(element)
  //   let accountingValue = element.properties?.accountingValue
  //   if (accountingValue.startsWith("{")) {
  //     accountingValue = this.getModel(localModelName).getProperty(
  //       `/BPMNform/${/{(.*)}/.exec(accountingValue)[1]}`
  //     ) as string
  //   }
  //   let quantity = element.properties?.quantity
  //   if (quantity.startsWith("{")) {
  //     quantity = this.getModel(localModelName).getProperty(`/BPMNform/${/{(.*)}/.exec(quantity)[1]}`) as string
  //   }

  //   element.properties.for = this.resolveVariables(element.properties.for)

  //   const controlConfiguration = {
  //     visible,
  //     accountingValue: accountingValue,
  //     quantity: quantity,
  //     staticFilters: this.getStaticFiltersFromCamundaProperties(element),
  //     camundaConfiguration: element,
  //     change: () => {
  //       this._validate()
  //     }
  //   }

  //   const control = new DynamicSum(controlConfiguration)

  //   this._addControl(element, control, ControlType.Textfield)
  //   this._validate()
  //   return
  // }

  /**
   * add checkbox as control
   * @param element component conficuation from camunda
   *
   * @return the created and addded control
   */
  private addCheckbox(element: Component): Control {
    if (this._checkIfNotSet(element)) {
      return
    }

    const selected =
      (this.getModel(localModelName) as JSONModel).getProperty(`/BPMNform/${element.key}`) || element.defaultValue

    const visible = this._getVisibleStatement(element)
    const control = new CheckBox(this._generateControlId(element), {
      visible: visible,
      selected: selected,
      text: element.label,
      select: () => {
        this._provideValueToView(element, control)
        this._validate()
      }
    })

    // handle visibility for deep if constructions,
    // if the control is set to invisible delete value and provide empty value
    // to local model to hide dependent controls as well
    const fn = control.setVisible
    control.setVisible = (value) => {
      fn.apply(control, [value])
      if (control.getVisible() === false) {
        if (element.validate?.required) {
          control.setValueState(ValueState.Error)
        }
        control.setSelected(false)
        this._provideValueToView(element, control)
      }

      return control
    }

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

  /**
   * add select control, register it and bind validation
   * @param element the component configuration from camunda
   *
   * @return the created and addded control
   */
  private addSelect(element: Component): Control {
    if (this._checkIfNotSet(element)) {
      return
    }

    const visible = this._getVisibleStatement(element)

    const control = new SelectList(this._generateControlId(element), {
      visible: visible,
      selectedKey: (this.getModel(localModelName) as JSONModel).getProperty(`/BPMNform/${element.key}`),
      forceSelection: false,
      change: (event) => {
        this._provideValueToView(element, control)
        this._setValueState(control, element, event.getParameter("selectedItem")?.getKey() as string)
      }
    })

    // hardcoded values or dynmic (json or odata)?
    if (element.properties?.type === "Dynamic") {
      let sorter
      if (element.properties?.sorter) {
        const sorterProperties = element.properties?.sorter.split(",")
        const desc = sorterProperties[1] === "DESC" ? true : false
        sorter = [new Sorter(sorterProperties[0], desc)]
      }

      if (!this.mandatoryFieldCheck(["service", "key", "display"], element)) {
        return
      }
      if (element.properties?.service === "json") {
        const displayElements = element.properties?.display.split(",")

        const display = displayElements.map((element) => `{${localModelName}>${element.trim()}}`).join(" - ")
        control.bindItems({
          path: `${localModelName}>/BPMNform/${element.properties?.for}`,
          length: 500,
          sorter: sorter,
          template: new Item({
            key: `{${localModelName}>${element.properties?.key}}`,
            text: display
          })
        })
      } else {
        const displayElements = element.properties?.display.split(",")
        const prefix = element.properties.service ? element.properties.service + ">" : ""
        let display = `{${prefix}${displayElements[0]}}`
        if (displayElements.length > 1) {
          display = `{${prefix}${displayElements[0]}} - {${prefix}${displayElements[1]}}`
        }
        const regex = /(.*){(.*)}(.*)/gm
        element.properties.for = element.properties.for.replace(
          regex,
          (total: string, a: string, b: string, c: string) => {
            const value = this.getModel(localModelName).getProperty(`/BPMNform/${b}`)
            return `${a}${value}${c}`
          }
        )

        // get all filter properties in camunda
        const filters = this.getDynamicFiltersFromCamundaProperties(element)

        control.bindAggregation("items", {
          path: `${prefix}/${element.properties.for}`,
          filters: filters ? filters : undefined,
          sorter: sorter,
          template: new Item({
            key: `{${prefix}${element.properties.key}}`,
            text: display
          })
        })
      }
    } else {
      if (element.properties?.sorter) {
        const sorterProperties = element.properties?.sorter.split(",")
        const desc = sorterProperties[1] === "DESC" ? true : false
        element.values = element.values.sort(function (a, b) {
          if (a.label < b.label) {
            return desc ? 1 : -1
          }
          if (a.label > b.label) {
            return desc ? -1 : 1
          }
          return 0
        })
      }
      element.values.forEach((value) => {
        control.addItem(new Item({ key: value.value, text: value.label }))
      })
    }

    // handle visibility for deep if constructions,
    // if the control is set to invisible delete value and provide empty value
    // to local model to hide dependent controls as well
    const fn = control.setVisible
    control.setVisible = (value) => {
      fn.apply(control, [value])
      if (control.getVisible() === false) {
        if (element.validate?.required) {
          control.setValueState(ValueState.Error)
        }
        control.setSelectedKey("")
        this._provideValueToView(element, control)
      }

      return control
    }

    this._addControl(element, control, ControlType.Select)
    this._setValueState(control, element, !!control.getSelectedKey() || false)

    return control
  }

  /**
   * creates a radio button group and adds it to the form
   * @param element camunda configuration for control creation
   * @returns the created and added control
   */
  private addRadioGroup(element: Component): Control {
    if (this._checkIfNotSet(element)) {
      return
    }

    const control = new RadioButtonGroup(this._generateControlId(element), {
      visible: this._getVisibleStatement(element),
      select: () => {
        control.setValueState(ValueState.None)
        this._provideValueToView(element, control)
        this._validate()
      },
      columns: element.values.length > 2 ? 1 : 2
    })

    // handle visibility for deep if constructions,
    // if the control is set to invisible delete value and provide empty value
    // to local model to hide dependent controls as well
    const fn = control.setVisible
    control.setVisible = (value) => {
      fn.apply(control, [value])
      if (control.getVisible() === false) {
        control.setSelectedIndex(-1)
        if (element.validate?.required) {
          control.setValueState(ValueState.Error)
        }
        this._provideValueToView(element, control)
        this._validate()
      } else {
        let selectedIndex = -1
        element.values.forEach((value, index) => {
          if (value.value === defaultValue) {
            selectedIndex = index
          }
        })
        control.setSelectedIndex(selectedIndex)
        if (element.validate?.required && selectedIndex === -1) {
          control.setValueState(ValueState.Error)
        } else {
          control.setValueState(ValueState.None)
        }
        this._validate()
      }

      return control
    }
    const defaultValue =
      ((this.getModel(localModelName) as JSONModel).getProperty(`/BPMNform/${element.key}`) as string) ||
      element.defaultValue

    let selectedIndex = -1
    element.values.forEach((value, index) => {
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

  /**
   * add datepicker control, register it and bind validation
   * @param element the component configuration from camunda
   *
   * @return the created and addded control
   */
  private addDate(element: Component): Control {
    if (this._checkIfNotSet(element)) {
      return
    }
    const control = new DatePicker(this._generateControlId(element), {
      visible: this._getVisibleStatement(element),
      valueFormat: "yyyy-MM-ddT00:00:00",
      displayFormat: "yyyy-MM-dd",
      change: (event: Event) => {
        this._setValueState(control, element, event.getParameter("valid") as boolean)
        this._provideValueToView(element, control)
      }
    })
    this._addControl(element, control, ControlType.DatePicker)
    this._setValueState(control, element, !element.validate?.required)

    return control
  }

  /**
   * add smartfeld control, register it
   * @param element the component configuration from camunda
   *
   * @return the created and addded control
   */
  private addSmartField(element: Component): Control {
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

  private addSuggestInput(element: Component) {
    element.properties.enableSuggestion = true
    element.properties.showDialog = false

    this.addValueHelpInput(element)
  }

  private resolveVariables(property: string): string {
    return property.replace(/(.*){(.*)}(.*)/gm, (total: string, a: string, b: string, c: string) => {
      const value = this.getModel(localModelName).getProperty(`/BPMNform/${b}`)
      return `${a}${value}${c}`
    })
  }

  /**
   * create an input with OData value help and add it to the form
   * @param element camunda configuration for control
   * @returns created control
   */
  // private addValueHelpInput(element: Component): Control {
  //   if (this._checkIfNotSet(element)) {
  //     return
  //   }

  //   if (!this.mandatoryFieldCheck(["type", "for", "display", "suggestFields"], element)) {
  //     return
  //   }

  //   const enableSuggestion =
  //     element.properties.enableSuggestion === "true" || element.properties.enableSuggestion === true ? true : false
  //   const showDialog =
  //     element.properties.showDialog === "false" || element.properties.showDialog === false ? false : true

  //   element.properties.for = this.resolveVariables(element.properties.for)

  //   const valueHelpSettings = {
  //     visible: this._getVisibleStatement(element),
  //     valueHelpSet: element.properties.for,
  //     suggestFields: element.properties.suggestFields,
  //     required: element.validate?.required,
  //     service: element.properties.service,
  //     elementConfiguration: element.properties,
  //     displayField: element.properties.display,
  //     enableSuggestion,
  //     showDialog,
  //     title: element.label,
  //     // prefill values with default value from camunda or preset variable as input
  //     value: this.getModel(localModelName).getProperty(`/BPMNform/${element.key}`) || element.defaultValue,
  //     change: (event: Event) => {
  //       this._provideValueToView(element, control)
  //       this._validate()
  //     }
  //   }
  //   const control = new ValueHelpInput(this._generateControlId(element), valueHelpSettings)

  //   // get all filter properties in camunda

  //   control.setStaticFilters(this.getStaticFiltersFromCamundaProperties(element))

  //   // handle visibility for deep if constructions,
  //   // if the control is set to invisible delete value and provide empty value
  //   // to local model to hide dependent controls as well
  //   const fn = control.setVisible
  //   control.setVisible = (value) => {
  //     fn.call(control, value)
  //     if (control.getVisible() === false) {
  //       control.setValue("")
  //       this._provideValueToView(element, control)
  //       this._validate()
  //     }

  //     return control
  //   }

  //   this._addControl(element, control, ControlType.ValueHelpInput)
  //   this._validate()

  //   return control
  // }

  private addText(element: Component) {
    const visible = this._getVisibleStatement(element)
    const text = new Markdown(`${uid()}-markdown`, {
      content: element.text.replace(/\{/gm, `\{${localModelName}>/BPMNform/`),
      visible: visible
    }) as Control
    if (element.properties?.type === "Description") {
      text.addStyleClass("bdaas-markdown-description")
    } else {
      text.addStyleClass("bdaas-markdown")
    }
    this._addControl(element, text, ControlType.Text, false, false, true)
  }

  /**
   * add control to formular and keep track of it
   *
   * @param element Component definition of camunda
   * @param control UI5 control to be added to form
   * @param controlType type of control
   */
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
    vbox.addStyleClass("bdaasWordBreak")
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

  /**
   * generate a label string for ui from camunda configuration
   *
   * @param element camunda control configuration
   * @returns the generated label from config
   */
  private generateLabelFromElement(element: Component): string {
    return element.description ? `${element.label} (${element.description})` : element.label
  }

  /**
   * framework called init function
   * initialises models and listeners
   */
  init(): void {
    console.debug(`[${this.getMetadata().getName()}] > init`)

    this._initLocalModel()

    EventBus.getInstance().subscribe("Camunda", "startProcess", () => {
      this._initLocalModel()
    })
  }

  /**
   * create local model for variable bindings and init with default variables
   */
  _initLocalModel() {
    console.debug(`[${this.getMetadata().getName()}] > local BPMN form model`)
    const data = {
      BPMNform: {}
    }
    if (this.getModel(localModelName)) {
      ;(this.getModel(localModelName) as JSONModel).setData(data)
    } else {
      this.setModel(new JSONModel(data), localModelName)
    }
  }

  /**
   * layout final process step screen,
   * also update the persisted "bdaas run" w/ the QAs
   *
   * @param data received data via websocket
   */
  endProcess(data: WebSocketData): void {
    this.fireEvent("summary")

    // layout container
    const container = new HBox({
      width: "100%"
    })
    container.addStyleClass("sapUiResponsiveMargin")
    container.setAlignItems("Center")

    // prep q+a container
    const content = new VBox({
      width: "100%"
    })
    content.addStyleClass("sapUiResponsiveMargin")
    // add heading to the q+a container
    if (data.type === "final-task-success") {
      content.addItem(new Title({ text: this.getFinalResultTextSuccess(), level: "H1", wrapping: true }))
    }
    if (data.type === "final-task-fail") {
      const h1 = new Title({ text: this.getFinalResultTextFail(), level: "H1", wrapping: true })
      h1.addStyleClass("sapUiSmallMarginBegin")
      const title = new HBox({
        items: [
          new Icon({
            src: "sap-icon://alert",
            color: "red"
          }),
          h1
        ]
      })
      content.addItem(title)
    }

    const viewModel = sap.ui.core.Component.getOwnerComponentFor(this).getModel("AppView") as JSONModel

    container.addItem(content)
    container.data("controlType", ControlType.Summary)

    this.addItem(container)

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

  /**
   * provide variables to view in local model for showing in markup or usage in conditions
   *
   * @param variables variables to set in local model
   * @private
   */
  _updateFormVariables(variables: { [index: string]: string }): void {
    for (const key in variables) {
      this.getLocalModel().setProperty(`/BPMNform/${key}`, variables[key])
    }
  }

  /**
   * create controls from camunda configuration and add to stage
   *
   * @param components array of camunda components
   */
  _generateControls(components: Component[]) {
    components.forEach((element) => {
      switch (element.type) {
        case ControlType.Textfield:
        case ControlType.Number:
          if (element.properties && element.properties.type) {
            switch (element.properties.type) {
              // case "DynamicSumSuggestInput":
              //   {
              //     element.properties.enableSuggestion = true
              //     element.properties.showDialog = false
              //     this.addDynamicSum(element)
              //   }
              //   break
              case "DynamicSumAutomatic":
                {
                  this.addDynamicSumAutomatic(element)
                }
                break
              // case "DynamicSumSelect":
              //   {
              //     this.addDynamicSum(element, true)
              //   }
              //   break
              default: {
                if (this[`add${element.properties.type}`]) {
                  this[`add${element.properties.type}`](element)
                }
              }
            }
          } else {
            if (element.properties && element.properties.type) {
              console.error(
                `Error 1650373370: Unupported sub type of Textfield. Missing add${element.properties.type} function in BPMNform`
              )
            }
            this.addTextfield(element)
          }
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

  /**
   * reset form contentssf
   */
  reset(): void {
    this.generatedControls = []
    this.removeAllItems()
  }

  /**
   * callback, before a control has been rendered
   */
  onBeforeRendering(): void {
    console.debug(`[${this.getMetadata().getName()}] > onBeforeRendering`)
  }

  /**
   * callback, after a control has been rendered
   */
  onAfterRendering(): void {
    console.debug(`[${this.getMetadata().getName()}] > onBeforeRendering`)
  }
}
