import Control from "sap/ui/core/Control"
import RenderManager from "sap/ui/core/RenderManager"
import { ValueState } from "sap/ui/core/library"
import Input from "sap/m/Input"
import Button from "sap/m/Button"
import VBox from "sap/m/VBox"
import HBox from "sap/m/HBox"
import Event from "sap/ui/base/Event"
import { Component, DynamicOutputTypes } from "./BPMNformData"
import ValueHelpInput from "./ValueHelpInput"
import Select from "sap/m/Select"
import Item from "sap/ui/core/Item"
import uid from "sap/base/util/uid"
import JSONModel from "sap/ui/model/json/JSONModel"
import { InputType } from "sap/m/library"
import Label from "sap/m/Label"
import Filter from "sap/ui/model/Filter"
import { SelectionModes } from "./BPMNformData"
import Sorter from "sap/ui/model/Sorter"

enum CalculationTypes {
  PERCENTAGE = "percentage",
  QUANTITY = "quantity",
  ACCOUNTING_VALUE = "value"
}

/**
 * @namespace bdaas.control
 */
class DynamicSum extends Control {
  metadata = {
    properties: {
      value: {
        type: "string"
      },
      camundaConfiguration: {
        type: "Object"
      },
      accountingValue: { type: "Number", defaultValue: 0 },
      quantity: { type: "Number", defaultValue: 0 },
      staticFilters: {
        type: "object",
        defaultValue: {}
      },
      useSelect: {
        type: "boolean",
        defaultValue: false
      },
      /**
       * Visualizes the validation state of the control, e.g. <code>Error</code>, <code>Warning</code>, <code>Success</code>.
       */
      valueState: { type: "sap.ui.core.ValueState", group: "Appearance", defaultValue: ValueState.None }
    },
    aggregations: {
      _calculationTypeSelector: { type: "sap.m.Select", multiple: false, visibility: "hidden" },
      _addButton: { type: "sap.m.Button", multiple: false, visibility: "hidden" },
      _columnTitleBox: { type: "sap.m.HBox", multiple: false, visibility: "hidden" },
      _columnFooterBox: { type: "sap.m.HBox", multiple: false, visibility: "hidden" },
      _lineItemsContainer: { type: "sap.m.VBox", multiple: false, visibility: "hidden" }
    },
    events: {
      change: {}
    }
  }

  getValue(): string {
    const container = this.getAggregation("_lineItemsContainer") as VBox
    const data = {
      accountingline: [],
      CalculationType: this.getModel(this._localModelName).getProperty("/selectedCalculation")
    }
    for (const lineItem of container.getItems()) {
      const value = lineItem.getItems()[0].getValue()
      let key: string
      switch (this.getCamundaConfiguration().properties.selectionMode) {
        case SelectionModes.select:
          {
            key = lineItem.getItems()[1].getSelectedKey()
          }
          break
        case SelectionModes.valuehelp:
        default: {
          key = lineItem.getItems()[1].getValue()
        }
      }

      switch (this.getCamundaConfiguration().properties.outputType) {
        case DynamicOutputTypes.project:
          {
            data.accountingline.push({
              ID: key,
              AccountingValue: value,
              PSPElement: "" // constant empty value, because of JSON parser on camunda side
            })
          }
          break
        case DynamicOutputTypes.default:
        default:
          {
            data.accountingline.push({
              COElement: key,
              AccountingValue: value,
              PSPElement: "" // constant empty value, because of JSON parser on camunda side
            })
          }
          break
      }
    }
    return JSON.stringify(data)
  }
  _isSetUp = false

  onAfterRendering(): void {
    if (!this._isSetUp) {
      this.addLineItem(false)
      this.addLineItem(false)
    }

    this._isSetUp = true
  }

  _localModelName: string

  getCamundaConfiguration(): Component

  removeLineItem(event: Event) {
    const lineItem = (event.getSource() as Control).getParent() as HBox
    ;(this.getAggregation("_lineItemsContainer") as VBox).removeItem(lineItem)
    this.validate()
  }

  createSelectControl(): Control {
    const camundaConfiguration = this.getCamundaConfiguration()
    const prefix = camundaConfiguration.properties.service ? camundaConfiguration.properties.service + ">" : ""

    const control = new Select({
      forceSelection: false,
      selectedKey: camundaConfiguration.properties?.key,
      valueState: ValueState.Error,
      change: (oEvent) => {
        const select = oEvent.getSource() as Select
        if (!select.getSelectedKey()) {
          select.setValueState(ValueState.Error)
        } else {
          select.setValueState(ValueState.None)
        }
        this.validate()
      }
    })

    const displayElements = camundaConfiguration.properties?.display.split(",")

    let display = `{${prefix}${displayElements[0]}}`
    if (displayElements.length > 1) {
      display = `{${prefix}${displayElements[0]}} - {${prefix}${displayElements[1]}}`
    }
    const regex = /(.*){(.*)}(.*)/gm
    camundaConfiguration.properties.for = camundaConfiguration.properties.for.replace(
      regex,
      (total: string, a: string, b: string, c: string) => {
        const value = this.getModel(localModelName).getProperty(`/BPMNform/${b}`)
        return `${a}${value}${c}`
      }
    )

    const filters = ValueHelpInput.prototype.getStaticFilters.apply(this)

    let sorter
    if (camundaConfiguration.properties?.sorter) {
      const sorterProperties = camundaConfiguration.properties?.sorter.split(",")
      const desc = sorterProperties[1] === "DESC" ? true : false
      sorter = [new Sorter(sorterProperties[0], desc)]
    }

    control.bindAggregation("items", {
      path: `${prefix}/${camundaConfiguration.properties.for}`,
      filters: filters ? filters : undefined,
      sorter: sorter,
      template: new Item({
        key: `{${prefix}${camundaConfiguration.properties.key}}`,
        text: display
      })
    })

    return control.addStyleClass("sapUiTinyMarginBegin")
  }

  createValueHelpInputControl(): Control {
    return new ValueHelpInput({
      change: this.validate.bind(this),
      valueHelpSet: this.getCamundaConfiguration().properties?.for,
      service: this.getCamundaConfiguration().properties?.service,
      suggestFields: this.getCamundaConfiguration().properties?.suggestFields,
      displayField: this.getCamundaConfiguration().properties?.display,
      enableSuggestion: this.getCamundaConfiguration().properties?.enableSuggestion,
      showDialog: this.getCamundaConfiguration().properties?.showDialog,
      staticFilters: this.getStaticFilters(),
      required: true,
      width: "22.4rem"
    }).addStyleClass("sapUiTinyMarginBegin")
  }

  addLineItem(isRemovable = true) {
    const container = this.getAggregation("_lineItemsContainer") as VBox

    let selector: Control
    switch (this.getCamundaConfiguration().properties.selectionMode) {
      case SelectionModes.select:
        {
          selector = this.createSelectControl()
        }
        break
      case SelectionModes.valuehelp:
      default:
        {
          selector = this.createValueHelpInputControl()
        }
        break
    }

    const lineItem = new HBox({
      items: [
        new Input({
          liveChange: this.validate.bind(this),
          width: "7.5rem",
          type: InputType.Number,
          valueLiveUpdate: true
        }),
        selector
      ]
    })

    if (isRemovable) {
      lineItem.addItem(
        new Button({
          icon: "sap-icon://delete",
          type: "Transparent",
          press: this.removeLineItem.bind(this)
        }).addStyleClass("sapUiTinyMarginBegin")
      )
    }

    container.addItem(lineItem)
    this.validate()
  }

  singleInputValidation() {
    const container = this.getAggregation("_lineItemsContainer") as VBox
    let singleInputValidation = true
    for (const item of container.getItems()) {
      // check number input
      const input = (item as HBox).getItems()[0] as Input
      const value = input.getValue()
      switch (this.getModel(this._localModelName).getProperty("/selectedCalculation")) {
        case CalculationTypes.PERCENTAGE:
          {
            if (!/^\d{1,3}([,.]?\d?)$/g.test(value) || Number(value) >= 100) {
              input.setValueStateText(
                "Nur Eingaben <100 mit maximal einer Nachkommastelle sind bei prozentualer Verteilung erlaubt!"
              )
              input.setValueState(ValueState.Error)
              singleInputValidation = false
            }
          }
          break
        case CalculationTypes.QUANTITY:
          {
            if (!/^\d{0,10}([,.]?\d{0,3})$/g.test(value)) {
              input.setValueStateText(
                "Nur Eingaben mit 10 Vor- und 3 Nachkommastellen sind bei mengenmäßiger Verteilung erlaubt!"
              )
              input.setValueState(ValueState.Error)
              singleInputValidation = false
            }
          }
          break
      }
      // check if corresponding type is set
      const typeControl = (item as HBox).getItems()[1]

      if (typeControl instanceof Select) {
        if (
          !typeControl.getSelectedKey() ||
          typeControl.getSelectedKey() === this.getCamundaConfiguration().properties?.key
        ) {
          singleInputValidation = false
        }
      } else {
        if (!typeControl.getValue()) {
          singleInputValidation = false
        }
      }
    }
    return singleInputValidation
  }

  contextInputValidation() {
    const container = this.getAggregation("_lineItemsContainer") as VBox
    let amountValid = true
    let typeValid = true
    let allowedTotal = 0
    let total = 0

    const setValueStateOfNumberInputs = (state: ValueState, value: number) => {
      for (const item of container.getItems()) {
        const input = (item as HBox).getItems()[0] as Input
        input.setValueState(state)
        if (this.getModel(this._localModelName).getProperty("/selectedCalculation") === CalculationTypes.PERCENTAGE) {
          input.setValueStateText("Die Summe muss bei prozentualer Berechnung 100 ergeben.")
        } else {
          input.setValueStateText(`Die Summe muss ${value} ergeben.`)
        }
      }
    }

    for (const lineItem of container.getItems()) {
      const inputItem = lineItem.getItems()[0]
      const value = (inputItem as Input).getValue()

      total += Number(value)
      const selectControl = (lineItem as HBox).getItems()[1]
      let selectedValue
      if (selectControl instanceof Select) {
        selectedValue = selectControl.getSelectedKey()
      } else {
        selectedValue = selectControl.getValue()
      }
      if (!selectedValue) {
        typeValid = false
      }
    }

    switch (this.getModel(this._localModelName).getProperty("/selectedCalculation")) {
      case CalculationTypes.PERCENTAGE:
        allowedTotal = (100).toFixed(1)
        total = total.toFixed(1)
        break
      case CalculationTypes.QUANTITY:
        allowedTotal = (this.getQuantity() * 1).toFixed(3)
        total = total.toFixed(3)
        break
      case CalculationTypes.ACCOUNTING_VALUE:
        allowedTotal = (this.getAccountingValue() * 1).toFixed(0)
        total = total.toFixed(0)
        break
    }

    if (total != allowedTotal) {
      setValueStateOfNumberInputs(ValueState.Error, allowedTotal)
      amountValid = false
    } else {
      setValueStateOfNumberInputs(ValueState.None, 0)
    }

    this.getLocalModel().setProperty("/maxTotalValue", allowedTotal)
    this.getLocalModel().setProperty("/currentTotalValue", total)

    return amountValid && typeValid
  }

  validate() {
    let valid = true
    if (!this.singleInputValidation()) {
      valid = false
    }

    if (!valid || !this.contextInputValidation()) {
      valid = false
    }

    if (valid) {
      this.setValueState(ValueState.None)
      this.fireChange({ valid: true })
    } else {
      this.setValueState(ValueState.Error)
      this.fireChange({ valid: false })
    }
  }

  contentDensityClass: string

  init(): void {
    this.setValueState(ValueState.Error)

    this._setupModel()

    this._setupChildAggregations()
  }

  _setupModel() {
    this._localModelName = uid()
    this.setModel(
      new JSONModel({
        calculationTypes: [
          {
            key: CalculationTypes.QUANTITY,
            text: "Mengenmäßige Verteilung"
          },
          {
            key: CalculationTypes.PERCENTAGE,
            text: "Prozentuale Verteilung"
          }
        ],
        selectedCalculation: CalculationTypes.PERCENTAGE
      }),
      this._localModelName
    )
  }

  _setupChildAggregations() {
    const addButton = new Button({
      icon: "sap-icon://add",
      type: "Emphasized",
      press: this.addLineItem.bind(this)
    }).addStyleClass("sapUiSmallMarginBegin")
    this.setAggregation("_addButton", addButton)

    const vbox = new VBox()
    this.setAggregation("_lineItemsContainer", vbox)

    const select = new Select({
      selectedKey: `{${this._localModelName}>/selectedCalculation}`,
      change: this.onChangeSelectedCalculation.bind(this)
    })
    select.bindItems({
      path: `${this._localModelName}>/calculationTypes`,
      template: new Item({
        key: `{${this._localModelName}>key}`,
        text: `{${this._localModelName}>text}`
      })
    })

    this.setAggregation("_calculationTypeSelector", select)

    const hbox = new HBox({
      items: [
        new Label({ text: `{${this._localModelName}>/column1Title}`, width: "7.5rem" }),
        new Label({ text: `{${this._localModelName}>/column2Title}` })
      ]
    })
    this.setAggregation("_columnTitleBox", hbox)

    const footer = new HBox({
      items: [
        new Label({
          text: `{${this._localModelName}>/currentTotalValue} von {${this._localModelName}>/maxTotalValue}`
        })
      ]
    })
    this.setAggregation("_columnFooterBox", footer)
  }

  onChangeSelectedCalculation() {
    this.setColumnTitles()
    this.validate()
  }

  setColumnTitles() {
    let col1Title
    switch (this.getLocalModel().getProperty("/selectedCalculation")) {
      case CalculationTypes.PERCENTAGE:
        {
          col1Title = "% Anteil"
        }
        break
      case CalculationTypes.QUANTITY:
        {
          col1Title = "Anzahl"
        }
        break
      case CalculationTypes.ACCOUNTING_VALUE:
        {
          col1Title = "Wert"
        }
        break
    }
    this.getLocalModel().setProperty("/column1Title", col1Title)
    this.getLocalModel().setProperty("/column2Title", "Auswahl")
  }

  getLocalModel(): JSONModel {
    return this.getModel(this._localModelName) as JSONModel
  }

  renderer = {
    apiVersion: 2,

    render: (rm: RenderManager, control: DynamicSum): void => {
      control.setColumnTitles()
      rm.openStart("div", control)
      rm.openEnd()
      rm.renderControl(control.getAggregation("_calculationTypeSelector") as Control)
      rm.renderControl(control.getAggregation("_addButton") as Control)
      rm.renderControl(control.getAggregation("_columnTitleBox") as Control)
      rm.renderControl(control.getAggregation("_lineItemsContainer") as Control)
      rm.renderControl(control.getAggregation("_columnFooterBox") as Control)
      rm.close("div")
    }
  }
}

export default DynamicSum
