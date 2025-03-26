import CheckBox from "sap/m/CheckBox"
import Control from "sap/ui/core/Control"
import { Component, ControlType } from "../BPMNformData"
import BPMNForm from "../BPMNForm"

export function addCheckbox(this: BPMNForm, element: Component): Control {
  const selected =
    this.getLocalModel().getProperty(`/BPMNform/${element.key}`) ||
    this.getLocalModel().getProperty(`/BPMNform/variables/${element.key}`) ||
    element.defaultValue

  const enabled = element.disabled
  const readonly = element.readonly
  const required = element.validate?.required || false
  const visible = this.getVisibleStatement(element)
  // const requiredStyle = '<span data-colon=":" aria-hidden="true" class="sapMLabelColonAndRequired"></span>'
  const control = new CheckBox(this.generateControlId(element), {
    visible,
    selected,
    required, // prop only available from >1.124
    enabled: !enabled,
    editable: !readonly,
    text: element.label,
    select: () => {
      this.provideValueToView(element, control)
      this.validate()
    }
  })

  this.provideValueToView(element, control)
  this.addControl(element, control, ControlType.CheckBox, false)
  this.validate()

  return control
}
