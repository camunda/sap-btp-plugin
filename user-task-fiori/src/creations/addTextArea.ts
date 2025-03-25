import TextArea from "sap/m/TextArea";
import Control from "sap/ui/core/Control";
import { Component, ControlType } from "../BPMNformData";
import { evaluate } from "feelers";
import BPMNForm from "../BPMNForm";

export function addTextArea(this: BPMNForm, element: Component): Control {
  const defaultValue: string =
    this.getLocalModel().getProperty(`/BPMNform/${element.key}`) ||
    this.getLocalModel().getProperty(`/BPMNform/variables/${element.key}`) ||
    element.defaultValue;

  const enabled = element.disabled;
  const readonly = element.readonly
    ? // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      !!evaluate(element.readonly.toString(), this.getLocalModel().getProperty("/BPMNform/variables"))
    : false;
  const required = element.validate?.required || false;

  const control = new TextArea(this.generateControlId(element), {
    visible: this.getVisibleStatement(element),
    value: defaultValue,
    enabled: !enabled,
    editable: !readonly,
    required,
    cols: 50,
    rows: 20
  });

  this.addControl(element, control, ControlType.Textarea);
  this.setValueState(control, element, control.getValue());

  return control;
}
