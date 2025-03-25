import Input from "sap/m/Input";
import Control from "sap/ui/core/Control";
import { ValueState } from "sap/ui/core/library";
import { InputType } from "sap/m/library";
import Label from "sap/m/Label";
import HBox from "sap/m/HBox";
import { Component, ControlType } from "../BPMNformData";
import { evaluate } from "feelers";
import BPMNForm from "../BPMNForm";

export function addInput(this: BPMNForm, element: Component): Control {
  const defaultValue =
    (this.getLocalModel().getProperty(`/BPMNform/${element.key}`) as string) ||
    this.getLocalModel().getProperty(`/BPMNform/variables/${element.key}`) ||
    (element.defaultValue as string);

  const enabled = element.disabled;
  const readonly = element.readonly
    ? !!evaluate(element.readonly.toString(), this.getLocalModel().getProperty("/BPMNform/variables"))
    : false;
  const required = element.validate?.required || false;

  const control = new Input(this.generateControlId(element), {
    visible: this.getVisibleStatement(element),
    enabled: !enabled,
    editable: !readonly,
    required,
    value: defaultValue,
    valueLiveUpdate: true,
    liveChange: (event) => {
      this.provideValueToView(element, control);
      this.setValueState(control, element, event.getParameter("value"));
    }
  });

  if (element.type === ControlType.Textfield && element.validate?.pattern) {
    try {
      new RegExp(element.validate.pattern); //> throws on invalid regex
      control.attachLiveChange((event) => {
        const value = event.getParameter("value");
        const regex = new RegExp(element.validate.pattern);
        if (!regex.test(value)) {
          control.setValueState(ValueState.Error);
          control.setValueStateText(this.i18n.getText("Input.pattern_error"));
        } else {
          control.setValueState(ValueState.None);
        }
      });
    } catch (error) {
      console.error(
        `[${this.getId()}] - ${JSON.stringify(error)} - invalid regular expression in pattern: ${element.validate.pattern}`
      );
    }
  }

  if (element.validate?.validationType === "email") {
    makeEmailInput.call(this);
  }
  if (element.validate?.validationType === "phone") {
    makePhoneInput.call(this);
  }

  if (element.type === ControlType.Number) {
    makeNumberInput.call(this);
  }
  if (element.appearance?.suffixAdorner) {
    addSuffix.call(this);
  }
  if (element.appearance?.prefixAdorner) {
    return addPrefix.call(this);
  }
  if (element.validate?.min || element.validate?.max || element.validate?.minLength || element.validate?.maxLength) {
    addMinMaxValidation.call(this);
  }

  this.addControl(element, control, ControlType.Textfield);
  this.setValueState(control, element, control.getValue());

  return control;

  function makeNumberInput(this: BPMNForm) {
    control.setType(InputType.Number);
    if (element.decimalDigits) {
      control.attachLiveChange((event) => {
        const value = event.getParameter("value");
        const regex = new RegExp(`^-?\\d*[.,]?\\d{0,${element.decimalDigits}}$`);
        if (!regex.test(value)) {
          control.setValueState(ValueState.Error);
          control.setValueStateText(this.i18n.getText("NumberInput.decimal_digits_error", [element.decimalDigits]));
        } else {
          control.setValueState(ValueState.None);
        }
      });
    }
  }

  function makePhoneInput(this: BPMNForm) {
    control.setType(InputType.Tel);
    control.attachLiveChange((event) => {
      const value = event.getParameter("value");
      const regex = new RegExp(/^(\+?\d{1,3}[-.\s]*)?(\(?\d{1,4}\)?[-.\s]*){2,3}\d{1,4}$/);
      if (!regex.test(value)) {
        control.setValueState(ValueState.Error);
        control.setValueStateText(this.i18n.getText("PhoneInput.error"));
      } else {
        control.setValueState(ValueState.None);
      }
    });
  }

  function makeEmailInput(this: BPMNForm) {
    control.setType(InputType.Email);
    control.attachLiveChange((event) => {
      const value = event.getParameter("value");
      const regex = new RegExp(
        `^((\\.?[^<>()\\[\\]\\.,;:\\s@"]+(\\.[^<>()\\[\\]\\.,;:\\s@"]+)*)|(".+"))@((\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}])|(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))$`
      );
      if (!regex.test(value)) {
        control.setValueState(ValueState.Error);
        control.setValueStateText(this.i18n.getText("EmailInput.error"));
      } else {
        control.setValueState(ValueState.None);
      }
    });
  }

  function addMinMaxValidation(this: BPMNForm) {
    control.attachLiveChange((event) => {
      const charCount = event.getParameter("value").length || 0;
      const min = element.validate.min || element.validate.minLength;
      const max = element.validate.max || element.validate.maxLength;
      if (min && charCount < min) {
        control.setValueState(ValueState.Error);
        control.setValueStateText(this.i18n.getText("Input.min_length_error", [min]));
      } else if (max && charCount > max) {
        control.setValueState(ValueState.Error);
        control.setValueStateText(this.i18n.getText("Input.max_length_error", [max]));
      } else {
        control.setValueState(ValueState.None);
      }
    });
  }

  function addPrefix(this: BPMNForm) {
    const label = new Label({
      text: evaluate(
        element.appearance.prefixAdorner.toString(),
        this.getLocalModel().getProperty("/BPMNform/variables")
      ),
      labelFor: control.getId()
    }).addStyleClass("sapUiTinyMarginEnd");
    const hbox = new HBox({ alignItems: "Center" }).addItem(label).addItem(control);

    const fn = hbox.setVisible;
    hbox.setVisible = (value) => {
      fn.apply(control, [value]);
      if (control.getVisible() === false) {
        if (element.validate?.required) {
          control.setValueState(ValueState.Error);
        }
        control.setValue("");
        this._provideValueToView(element, control);
      }
      return control;
    };
    this.addControl(element, hbox, ControlType.Textfield);
    this.setValueState(control, element, control.getValue());

    return control;
  }

  function addSuffix(this: BPMNForm) {
    control.setDescription(
      evaluate(
        element.appearance.suffixAdorner.toString(),
        this.getLocalModel().getProperty("/BPMNform/variables")
      )
    );
  }
}
