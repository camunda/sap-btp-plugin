import RadioButtonGroup from "sap/m/RadioButtonGroup";
import RadioButton from "sap/m/RadioButton";
import Control from "sap/ui/core/Control";
import CustomData from "sap/ui/core/CustomData";
import { ValueState } from "sap/ui/core/library";
import { Component, ControlType } from "../BPMNformData";
import BPMNForm from "../BPMNForm";

export function addRadioGroup(this: BPMNForm, element: Component): Control {
  const enabled = element.disabled;
  const readonly = element.readonly;

  const control = new RadioButtonGroup(this.generateControlId(element), {
    enabled: !enabled,
    editable: !readonly,
    visible: this.getVisibleStatement(element),
    select: () => {
      control.setValueState(ValueState.None);
      this.provideValueToView(element, control);
      this.validate();
    },
    columns: element.values?.length > 2 ? 1 : 2
  });

  const defaultValue =
    (this.getLocalModel().getProperty(`/BPMNform/${element.key}`) as string) ||
    this.getLocalModel().getProperty(`/BPMNform/variables/${element.key}`) ||
    element.defaultValue;

  let selectedIndex = -1;
  element.values?.forEach((value, index) => {
    const radioButton = new RadioButton(`${this.generateControlId(element)}-${index}`, { text: value.label });
    // attach a pseudo-"key" to the radio button for later data retrieval
    radioButton.addCustomData(new CustomData({ key: value.value, value: value.value }));
    if (value.value === defaultValue) {
      selectedIndex = index;
    }
    control.addButton(radioButton);
  });

  control.setSelectedIndex(selectedIndex);

  this.provideValueToView(element, control);

  if (element.validate?.required && (!defaultValue || defaultValue === "<none>")) {
    control.setValueState(ValueState.Error);
  }

  this.addControl(element, control, ControlType.Radio);

  this.validate();

  return control;
}
