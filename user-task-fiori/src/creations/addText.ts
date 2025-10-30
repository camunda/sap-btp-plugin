import uid from "sap/base/util/uid"
import Control from "sap/ui/core/Control"
import { Component, ControlType } from "../BPMNformData"
import { evaluate } from "feelers"
import Markdown from "ui5-cc-md"
import BPMNForm from "../BPMNForm"

export function addText(this: BPMNForm, element: Component): void {
  let content = element.text
  content = evaluate(content, this.getLocalModel().getProperty("/BPMNform/variables"))
  const text = new Markdown(`${uid()}-markdown`, {
    content
  }) as Control
  this.addControl(
    element,
    text,
    ControlType.Text,
    false /* show Label */,
    false /* track value for sending to camunda */,
    true /* full width */
  )
}
