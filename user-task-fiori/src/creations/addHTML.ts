import HTML from "sap/ui/core/HTML"
import Control from "sap/ui/core/Control"
import { Component, ControlType } from "../BPMNformData"
import { evaluate } from "feelers"
import BPMNForm from "../BPMNForm"

export function addHTML(this: BPMNForm, element: Component): Control {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const content: string = evaluate(element.content.toString(), this.getLocalModel().getProperty("/BPMNform/variables"))
  const control = new HTML(this.generateControlId(element), {
    visible: this.getVisibleStatement(element),
    content,
    sanitizeContent: true,
    preferDOM: false
  })
  this.addControl(element, control, ControlType.HTML)

  return control
}
