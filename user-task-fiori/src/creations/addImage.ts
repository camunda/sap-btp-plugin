import Image from "sap/m/Image";
import Control from "sap/ui/core/Control";
import { Component, ControlType } from "../BPMNformData";
import BPMNForm from "../BPMNForm";

export function addImage(this: BPMNForm, element: Component): Control {
  const control = new Image(this.generateControlId(element), {
    visible: this.getVisibleStatement(element),
    src: element.source,
    alt: element.alt
  });

  this.addControl(element, control, ControlType.Image);

  return control;
}
