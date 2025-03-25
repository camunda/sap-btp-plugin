import Select from "sap/m/Select"
import Control from "sap/ui/core/Control"
import Item from "sap/ui/core/Item"
import { Component, ControlType } from "../BPMNformData"
import BPMNForm from "../BPMNForm"

export function addSelect(this: BPMNForm, element: Component): Control {
  const visible = this.getVisibleStatement(element)

  const control = new Select(this.generateControlId(element), {
    visible: visible,
    selectedKey:
      this.getLocalModel().getProperty(`/BPMNform/${element.key}`) ||
      this.getLocalModel().getProperty(`/BPMNform/variables/${element.key}`) ||
      element.defaultValue,
    forceSelection: false,
    change: (event) => {
      this.provideValueToView(element, control)
      this.setValueState(control, element, event.getParameter("selectedItem")?.getKey())
    }
  })

  element.values?.forEach((value) => {
    control.addItem(new Item({ key: value.value, text: value.label }))
  })

  this.addControl(element, control, ControlType.Select)
  this.setValueState(control, element, !!control.getSelectedKey() || false)

  return control
}
