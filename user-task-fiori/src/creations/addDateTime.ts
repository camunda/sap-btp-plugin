import DatePicker from "sap/m/DatePicker"
import TimePicker from "sap/m/TimePicker"
import DateTimePicker from "sap/m/DateTimePicker"
import Control from "sap/ui/core/Control"
import { Component, ControlType } from "../BPMNformData"
import { evaluate } from "feelers"
import BPMNForm from "../BPMNForm"

export function addDateTime(this: BPMNForm, element: Component): Control {
  let control: DateTimePicker | DatePicker | TimePicker
  if (element.subtype && element.subtype === "date") {
    control = new DatePicker(this.generateControlId(element), {
      visible: this.getVisibleStatement(element),
      valueFormat: "yyyy-MM-dd",
      displayFormat: "yyyy-MM-dd"
    })
    if (element.disallowPassedDates) {
      control.setMinDate(new Date())
    }
  } else if (element.subtype && element.subtype === "time") {
    control = new TimePicker(this.generateControlId(element), {
      visible: this.getVisibleStatement(element),
      support2400: element.use24h,
      valueFormat: element.use24h ? "HH:mm:ss" : "hh:mm:ss aa",
      displayFormat: element.use24h ? "HH:mm:ss" : "hh:mm:ss aa",
      showCurrentTimeButton: true
    })
  } else if (element.subtype && element.subtype === "datetime") {
    control = new DateTimePicker(this.generateControlId(element), {
      visible: this.getVisibleStatement(element),
      valueFormat: element.use24h ? "yyyy-MM-ddTHH:mm:ss" : "yyyy-MM-ddThh:mm:ss aa",
      displayFormat: element.use24h ? "yyyy-MM-ddTHH:mm:ss" : "yyyy-MM-ddThh:mm:ss aa",
      showCurrentTimeButton: true
    })
  } else {
    throw new Error(`Unknown datetime subtype ${element.subtype}`)
  }

  const readonly = element.readonly
    ? !!evaluate(element.readonly.toString(), this.getLocalModel().getProperty("/BPMNform/variables"))
    : false
  const required = element.validate?.required || false

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  control.setEnabled(!element.disabled).setEditable(!readonly).setRequired(required)
  control.attachChange(event => {
    this.setValueState(control, element, event.getParameter("valid") as unknown as boolean)
    this.provideValueToView(element, control)
  })

  this.addControl(element, control, ControlType.DatePicker)
  this.setValueState(control, element, !element.validate?.required)

  return control
}
