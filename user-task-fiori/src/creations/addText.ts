import uid from "sap/base/util/uid"
import Control from "sap/ui/core/Control"
import { Component, ControlType } from "../BPMNformData"
import { evaluate } from "feelers"
import Markdown from "ui5-cc-md"
import BPMNForm from "../BPMNForm"

export function addText(this: BPMNForm, element: Component): void {
  const visible = this.getVisibleStatement(element)
  let content = element.text
  content = evaluate(content, this.getLocalModel().getProperty("/BPMNform/variables"))
  const text = new Markdown(`${uid()}-markdown`, {
    content,
    visible
  }) as Control
  this.addControl(element, text, ControlType.Text, false, false, true)
}

