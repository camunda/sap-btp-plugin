import Control from "sap/ui/core/Control"
import RenderManager from "sap/ui/core/RenderManager"
import Input from "sap/m/Input"
import uid from "sap/base/util/uid"
import Label from "sap/m/Label"
import ColumnListItem from "sap/m/ColumnListItem"
import ValueHelpDialog from "sap/ui/comp/valuehelpdialog/ValueHelpDialog"
import FilterBar from "sap/ui/comp/filterbar/FilterBar"
import JSONModel from "sap/ui/model/json/JSONModel"
import FilterGroupItem from "sap/ui/comp/filterbar/FilterGroupItem"
import Filter from "sap/ui/model/Filter"
import FilterOperator from "sap/ui/model/FilterOperator"
import Event from "sap/ui/base/Event"
import Token from "sap/m/Token"
import Device from "sap/ui/Device"
import Context from "sap/ui/model/Context"
import { ValueState } from "sap/ui/core/library"
import ODataModel from "sap/ui/model/odata/v2/ODataModel"
import Log from "sap/base/Log"
import Table from "sap/m/Table"
import Column from "sap/m/Column"

interface TableColumn {
  template: string
  label: string
}

interface ODataEntityType {
  name: string
  key: {
    propertyRef: [
      {
        name: string
      }
    ]
  }
  property: [{ name: string; type: string }]
}

/**
 * @namespace bdaas.control
 */
class ValueHelpInput extends Control {
  metadata = {
    properties: {
      width: {
        type: "string"
      },
      /**
       * EntitySet name of OData service in metadata
       */
      valueHelpSet: {
        type: "string"
      },
      /**
       * csv of all fields to show in suggestion table on type ahead
       */
      suggestFields: {
        type: "string"
      },
      /**
       * title of value help dialog
       */
      title: {
        type: "string",
        defaultValue: ""
      },
      /**
       * element configugration by camunda
       */
      elementConfiguration: {
        type: "object",
        defaultValue: {}
      },
      /**
       * field from value help set, that represents the human readable data.
       * value identifies the selected record, whereas the contents of displayField is shown in input field
       */
      displayField: {
        type: "string"
      },
      /**
       * selected key by value help
       */
      value: {
        type: "string",
        defaultValue: ""
      },
      /**
       * selected key by value help
       */
      service: {
        type: "string"
      },

      staticFilters: {
        type: "object",
        defaultValue: {}
      },

      enableSuggestion: {
        type: "boolean",
        defaultValue: false
      },

      showDialog: {
        type: "boolean",
        defaultValue: true
      },

      /**
       * Visualizes the validation state of the control, e.g. <code>Error</code>, <code>Warning</code>, <code>Success</code>.
       */
      valueState: { type: "sap.ui.core.ValueState", group: "Appearance", defaultValue: ValueState.None },

      required: {
        type: "Boolean",
        defaultValue: false
      }
    },
    aggregations: {
      _input: { type: "sap.m.Input", multiple: false, visibility: "hidden" },
      _valueHelpDialog: { type: "sap.ui.comp.valuehelpdialog.ValueHelpDialog", multiple: false, visibility: "hidden" },
      _valueHelpDialogFilterBar: {
        type: "sap.ui.comp.filterbar.FilterBar",
        multiple: false,
        visibility: "hidden"
      }
    },
    events: {
      change: {}
    }
  }

  _serializedFilters: string

  contentDensityClass: string

  _isSetUp = false

  _columnsModel: JSONModel

  _entityType: {
    key: {
      propertyRef: {
        name: string
      }[]
    }
  }

  init(): void {
    const id = uid()

    this.setProperty("value", "")

    const inputControl: Input = new Input(id, {
      suggest: this._handleSuggestion.bind(this),
      showTableSuggestionValueHelp: false,
      autocomplete: false,
      valueHelpRequest: this.onValueHelpRequest.bind(this),
      suggestionItemSelected: this.suggestionItemSelected.bind(this),
      liveChange: this.liveChangeInput.bind(this),
      valueLiveUpdate: true,
      submit: () => {
        this.changeInput(inputControl.getValue())
      }
    })

    // inputControl.addEventDelegate({
    //   onfocusout: () => {
    //     if (!this.getValue()) {
    //       console.log("test")
    //       this.changeInput(inputControl.getValue())
    //     }
    //   }
    // })

    this.setAggregation("_input", inputControl)
  }

  setValueState(state: ValueState): void {
    const input = this.getAggregation("_input") as Input
    input.setValueState(state)
    this.setProperty("valueState", state, true)
    switch (state) {
      case ValueState.Warning:
        {
          input.setValueStateText("Die Eingabe kann nicht ausgewertet werden.")
        }
        break
      case ValueState.Error:
        {
          input.setValueStateText("Dies ist ein Pflichtfeld. Die Eingabe kann nicht ausgewertet werden.")
        }
        break
      default: {
        input.setValueStateText("")
      }
    }
  }

  liveChangeInput(): void {
    this.setValue("", false)
    const input = this.getAggregation("_input") as Input
    const valueStateText = input.getValueStateText()
    const startPhrase = "Bitte bestätigen Sie die Eingabe mit Enter! "
    if (!valueStateText.startsWith(startPhrase)) {
      input.setValueStateText(startPhrase + valueStateText)
    }
    this.fireEvent("change", {
      valid: false
    })
  }

  /**
   * is fired, when something is typed/pasted to input field
   * it checks the odata service, if the text matches a single odata entity (id)
   *
   * @param event ui5 event of input field
   */
  changeInput(input: string): void {
    input = input.trim()
    this.fireEvent("change", {
      valid: false
    })
    this.setValue("", false)
    if (!input) {
      return
    }
    const oDataModel = this.getModel(this.getService()) as ODataModel
    const setName = this.getValueHelpSet()
    const staticFilters = this.getStaticFilters()

    if (this.getRequired() && !input) {
      this.setValueState(ValueState.Error)
      this.setValue("", false)
      this.fireEvent("change", {
        valid: false
      })
    } else {
      const _input = this.getAggregation("_input") as Input

      if (this.getRequired()) {
        _input.setValueState(ValueState.Error)
      } else {
        _input.setValueState(ValueState.Warning)
      }
      this.setValue("", false)
      this.fireEvent("change", {
        valid: false
      })

      void this._getODataEntityType().then((entityType) => {
        if (entityType.key.propertyRef.length === 1) {
          const keyProperty = {}
          keyProperty[entityType.key.propertyRef[0].name] = input
          const key = oDataModel.createKey(setName, keyProperty)
          oDataModel.read(key, {
            success: (data: { [index: string]: string }) => {
              let valid = true
              for (const type in this.getProperty("staticFilters")) {
                const [filterPath, filterOperator, filterValue] = this.getProperty("staticFilters")[type].split(",")
                switch (filterOperator) {
                  case "StartsWith":
                    {
                      if (!data[filterPath].startsWith(filterValue)) {
                        valid = false
                      }
                    }
                    break
                  case "EndsWith":
                    {
                      if (!data[filterPath].endsWith(filterValue)) {
                        valid = false
                      }
                    }
                    break
                  case "EQ":
                    {
                      if (String(data[filterPath]) !== (filterValue as string)) {
                        valid = false
                      }
                    }
                    break
                  case "NE":
                    {
                      if (data[filterPath] === filterValue) {
                        valid = false
                      }
                    }
                    break
                  case "Contains":
                    {
                      if (data[filterPath].indexOf(filterValue) === -1) {
                        valid = false
                      }
                    }
                    break
                }
              }
              if (valid) {
                this.setValue(input)
                _input.setValue(`${data[entityType.key.propertyRef[0].name]} (${data[this.getDisplayField()]})`)
                this.fireEvent("change", {
                  valid: true
                })
              }
            },
            error: () => {
              console.error("ERROR 1668430307: Could not fetch entity from odata service.")
            }
          })
        } else {
          const idFilter = new Filter({
            path: entityType.key.propertyRef[0].name as string,
            operator: FilterOperator.EQ,
            value1: input
          })

          oDataModel.read(setName, {
            urlParameters: {
              $top: "2"
            },
            filters: staticFilters ? [staticFilters, idFilter] : [idFilter],
            success: (data: { results: [] }) => {
              if (data.results.length === 1) {
                this.setValue(input)
                _input.closeSuggestions()
                const resultEntry = data.results[0]
                _input.setValue(
                  `${resultEntry[entityType.key.propertyRef[0].name]} (${resultEntry[this.getDisplayField()]})`
                )
                this.fireEvent("change", {
                  valid: true
                })
              }
            },
            error: () => {
              console.error("ERROR 1668430307: Could not fetch entity from odata service.")
            }
          })
        }
      })
    }
  }

  /**
   * is called, when the suggestion table is opened, bc the user entered something into the input field
   *
   * @param {sap.ui.base.Event} event the ui5 event
   */
  _handleSuggestion(event: Event): void {
    const inputControl = this.getAggregation("_input")
    const suggestValue = event.getParameter("suggestValue") as string
    void this._getODataEntityType().then((data) => {
      const filters = []
      for (const property of data.property) {
        if (property.type === "Edm.String") {
          filters.push(
            new Filter({
              path: property.name,
              operator: FilterOperator.Contains,
              value1: suggestValue
            })
          )
        }
      }
      if (filters.length) {
        inputControl.getBinding("suggestionRows").filter(
          new Filter({
            filters,
            and: false
          })
        )
      }
    })
  }

  /**
   * everything is prepared and we can now add missing aggregations
   * and prepare the value help dialog and suggestions
   */
  onAfterRendering(): void {
    if (!this._isSetUp) {
      if (this.getEnableSuggestion()) {
        if (!this._getModelName()) {
          Log.error("1677488386516: suggestion ist due to performance reasons disabled for default model!")
        } else {
          this._setupSuggestion()
          this.getAggregation("_input").setShowSuggestion(true)
        }
      }
      if (this.getShowDialog()) {
        if (this._getModelName()) {
          Log.error("1676969452969: Named models are not supported for the ValueHelp Dialog!")
        } else {
          this.getAggregation("_input").setShowValueHelp(true)
        }
      }
      this._isSetUp = true
      this.setValueState(this.getRequired() ? ValueState.Error : ValueState.None)
      this.fireEvent("change", {
        valid: false
      })
      if (this.getValue()) {
        this.changeInput(this.getValue())
      }
    }
  }

  /**
   * bind aggregations to suggestion of input field
   */
  _setupSuggestion(): void {
    const input = this.getAggregation("_input") as Input

    // define rows of suggestion
    const rowTemplate = new ColumnListItem({
      cells: this.getSuggestFields().map(
        (field) =>
          new Label({
            text: `{${this._getModelName()}${field}}`
          })
      )
    })
    input.bindAggregation("suggestionRows", {
      path: this._getModelName() + this.getValueHelpSet(),
      filters: this.getStaticFilters(),
      template: rowTemplate
    })

    // define columns of suggestion
    this._getODataEntityType()
      .then((entityType) => {
        const columns = this.getSuggestFields().map((field) => {
          const width = this.getFieldConfiguration(field, "width") ? this.getFieldConfiguration(field, "width") : "auto"

          // 'cap>/Baskets/basketName/##com.sap.vocabularies.Common.v1.Label/String
          const fieldPrefix = `${this._getModelName()}/${entityType.name}/${field}`
          const labelText = `{${fieldPrefix}/##com.sap.vocabularies.Common.v1.Label/String}{${fieldPrefix}/#@sap:label}`
          return new Column({
            width: width,
            header: new Label({
              text: labelText
            })
          })
        })
        columns.forEach((column) => {
          input.addSuggestionColumn(column)
        })
      })
      .catch((e) => {
        console.error(e)
      })
  }

  /**
   * is called, when search button in value help dialog is clicked
   */
  onFilterBarSearch(event: Event): void {
    const selectionSet = event.getParameter("selectionSet") as string[]
    let filterAssigned = false
    const assignedFilter: Filter[] = selectionSet.reduce((filters: Filter[], control: Input) => {
      if (control.getValue()) {
        filterAssigned = true

        filters.push(
          new Filter({
            path: control.getName(),
            operator: FilterOperator.Contains,
            value1: control.getValue()
          })
        )
      }
      return filters
    }, [])

    if (filterAssigned && JSON.stringify(assignedFilter) !== this._serializedFilters) {
      this._serializedFilters = JSON.stringify(assignedFilter)
      this._filterValueHelpTable(assignedFilter)
    }
  }

  /**
   * filter table of value help dialog
   * @param filter filters array for value help dialog
   */
  _filterValueHelpTable(filter: Filter[]): void {
    const dialog = this.getAggregation("_valueHelpDialog") as ValueHelpDialog

    void dialog.getTableAsync().then((table) => {
      if (table.bindRows) {
        table.bindAggregation("rows", {
          path: this.getValueHelpSet(),
          filters: filter.concat(this.getStaticFilters() || [])
        })
      }

      if (table.bindItems) {
        table.bindAggregation("items", {
          path: this.getValueHelpSet(),
          filters: filter.concat(this.getStaticFilters() || []),
          factory: () => {
            return new ColumnListItem({
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              cells: this._columnsModel.getProperty("/cols").map((column: TableColumn) => {
                return new Label({ text: "{" + column.template + "}" })
              })
            })
          }
        })
      }

      dialog.update()
    })
  }

  _bindRowsAndItemsInDialog(): void {
    const dialog = this.getAggregation("_valueHelpDialog") as ValueHelpDialog
    dialog
      .getTableAsync()
      .then((table: Table) => {
        table.setModel(this._columnsModel, "columns")

        if (table.bindRows) {
          table.bindAggregation("rows", {
            path: this.getValueHelpSet(),
            filters: this.getStaticFilters()
          })
        }

        if (table.bindItems) {
          table.bindAggregation("items", {
            path: this.getValueHelpSet(),
            factory: () => {
              return new ColumnListItem({
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                cells: this._columnsModel.getProperty("/cols").map((column: TableColumn) => {
                  return new Label({ text: "{" + column.template + "}" })
                })
              })
            }
          })
        }
      })
      .catch((e) => {
        Log.error(e)
      })
  }

  suggestionItemSelected(event: Event): void {
    const input = this.getAggregation("_input") as Input
    const row = event.getParameter("selectedRow")
    const context: Context = row.getBindingContext(this.getService())
    void this._getODataEntityType().then((entityType) => {
      const displayedValue = `${context.getProperty(entityType.key.propertyRef[0].name)} (${context.getProperty(
        this.getDisplayField()
      )})`
      input.setValue(displayedValue)
      this.setValue(context.getProperty(entityType.key.propertyRef[0].name))
      this.fireEvent("change", {
        valid: true
      })
    })
  }

  /**
   * assign selected value of value help and assign to input
   *
   * @param event ok event of value help dialog
   */
  onValueHelpDialogOk(event: Event): void {
    const dialog = this.getAggregation("_valueHelpDialog") as ValueHelpDialog
    const tokens = event.getParameter("tokens") as Token[]
    const input = this.getAggregation("_input") as Input

    if (tokens.length > 0) {
      this.setValue(tokens[0].getKey())
      input.setValue(tokens[0].getText())
    }
    dialog.close()
    this.fireEvent("change", {
      valid: true
    })
  }

  /**
   * is called, when the value help dialog shall be opened
   */
  onValueHelpRequest(): void {
    let dialog = this.getAggregation("_valueHelpDialog")

    if (!dialog) {
      dialog = this._setupValueHelpDialog()

      // add filter bar
      this._setupFilterBar()
        .then((filterbar) => {
          dialog.setFilterBar(filterbar)
        })
        .catch(() => {
          console.error("Error 1649756531: Could not add filter bar to value help dialog")
        })
    }
    dialog.open()
  }

  /**
   * The odata model assigned to the control.
   * It return the service property followed by >.
   * If no value is given an empty string is returned
   *
   * @private
   * @returns the model name followed by ">"
   */
  _getModelName(): String {
    return this.getService() ? this.getService() + ">" : ""
  }

  _setupValueHelpDialog(): ValueHelpDialog {
    const dialog = new ValueHelpDialog({
      supportMultiselect: false,
      ok: this.onValueHelpDialogOk.bind(this),
      cancel: () => {
        this.getAggregation("_valueHelpDialog").close()
      },
      title: this.getTitle()
    })
    dialog.addStyleClass(this.getContentDensityClass())
    this.setAggregation("_valueHelpDialog", dialog)

    // set up table
    this._getODataEntityType()
      .then(async (entityType) => {
        const columns = this.getSuggestFields().map((field) => {
          const width = this.getFieldConfiguration(field, "width")
          return {
            label: `{${this._getModelName()}/#${entityType.name}/${field}/@Common.Label/String}`,
            template: field,
            width: width ? width : "auto"
          }
        })
        this._columnsModel = new JSONModel({
          cols: columns
        })
        dialog.setKey(entityType.key.propertyRef[0].name)
        dialog.setDescriptionKey(this.getDisplayField())
        dialog.setTokenDisplayBehaviour(sap.ui.comp.smartfilterbar.DisplayBehaviour.idAndDescription)

        // set up table columns
        const table = await dialog.getTableAsync()
        table.setModel(this._columnsModel, "columns")
      })
      .catch(() => {
        Log.error("Error 1649359090: ValueHelpInput - Could not fetch entity type name")
      })

    return dialog
  }

  _setupFilterBar(): Promise<FilterBar> {
    return new Promise((resolve, reject) => {
      const filterbar = new FilterBar({
        search: this.onFilterBarSearch.bind(this),
        isRunningInValueHelpDialog: true
      })

      // add filter fields per suggestionField to filterbar
      // fetch labels from odata metadata
      this._getODataEntityType()
        .then((entityType) => {
          this.getSuggestFields().forEach((field) => {
            const filterGroupItem = new FilterGroupItem({
              groupName: "__$INTERNAL$",
              name: field,
              label: `{${this._getModelName()}/#${entityType.name}/${field}/@sap:label}`,
              visibleInFilterBar: true,
              control: new Input({
                name: field,
                autocomplete: false,
                showClearIcon: true,
                submit: filterbar.search.bind(filterbar)
              })
            })
            filterbar.addFilterGroupItem(filterGroupItem)
          })

          resolve(filterbar)
        })
        .catch((error) => {
          console.error(error)
          reject(error)
        })
    })
  }

  getFieldConfiguration(field: string, property: string): string {
    // TODO: If more config is needed, we have to refactor this
    if (!!this.getElementConfiguration()[field]) {
      const config = this.getElementConfiguration()[field].split(":")
      if (config[0] === property) {
        return config[1]
      }
      return ""
    }
  }

  /**
   * This method can be called to determine whether the sapUiSizeCompact or sapUiSizeCozy
   * design mode class should be set, which influences the size appearance of some controls.
   *
   * @return {string} css class, either 'sapUiSizeCompact' or 'sapUiSizeCozy' - or an empty string if no css class should be set
   */
  getContentDensityClass(): string {
    if (this.contentDensityClass === undefined) {
      // check whether FLP has already set the content density class; do nothing in this case
      if (document.body.classList.contains("sapUiSizeCozy") || document.body.classList.contains("sapUiSizeCompact")) {
        this.contentDensityClass = ""
      } else if (!Device.support.touch) {
        // apply "compact" mode if touch is not supported
        this.contentDensityClass = "sapUiSizeCompact"
      } else {
        // "cozy" in case of touch support; default for most sap.m controls, but needed for desktop-first controls like sap.ui.table.Table
        this.contentDensityClass = "sapUiSizeCozy"
      }
    }
    return this.contentDensityClass
  }

  /**
   * fetch entity type for this valuehelp from odata metadata
   */
  _getODataEntityType(): Promise<ODataEntityType> {
    return new Promise((resolve) => {
      if (this._entityType) {
        resolve(this._entityType)
      } else {
        this.getModel(this.getService())
          .getMetaModel()
          .loaded()
          .then(() => {
            const fullqualifiedName = this.getModel(this.getService())
              .getMetaModel()
              .getODataEntitySet(this.getProperty("valueHelpSet")).entityType
            this._entityType = this.getModel(this.getService())
              .getMetaModel()
              .getODataEntityType(fullqualifiedName) as ODataEntityType

            resolve(this._entityType)
          })
      }
    })
  }

  getStaticFilters(): Filter {
    const filters = []
    for (const type in this.getProperty("staticFilters")) {
      let [path, operator, value1] = this.getProperty("staticFilters")[type].split(",")
      value1 = value1.trim()
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
    }
    return filters.length
      ? new Filter({
          filters,
          and: true
        })
      : undefined
  }

  /**
   * get all fields that shall be presented in suggestion of input field as columns
   * @returns {String[]}
   */
  getSuggestFields(): string[] {
    return (this.getProperty("suggestFields") as string).split(",")
  }

  /**
   * return target value help set path for suggestions and value help dialog
   * @returns {String}
   */
  getValueHelpSet(): string {
    return (this.getProperty("valueHelpSet") as string).replace(/^\/?(.*)/gm, "/$1")
  }

  /**
   * set value for control (!= to value visible in input field)
   * @param value value to set for control. means usually the key of the value help entry
   * @param invalidateInput overwrite value in visible input field
   */
  setValue(value: string, invalidateInput = true) {
    const _input = this.getAggregation("_input") as Input
    this.setProperty("value", value)
    if (!value) {
      if (this.getRequired()) {
        this.setValueState(ValueState.Error)
      } else if (_input.getValue()) {
        this.setValueState(ValueState.Warning)
      } else {
        this.setValueState(ValueState.None)
      }
      if (invalidateInput) {
        const input = this.getAggregation("_input") as Input
        input.setValue("")
      }
    } else {
      this.setValueState(ValueState.None)
    }
  }

  renderer = {
    apiVersion: 2,

    render: (rm: RenderManager, control: Control): void => {
      const input = control.getAggregation("_input") as Input
      input.setWidth(control.getWidth())
      rm.openStart("div", control)
      rm.openEnd()
      rm.renderControl(input)
      rm.close("div")
    }
  }
}

export default ValueHelpInput
