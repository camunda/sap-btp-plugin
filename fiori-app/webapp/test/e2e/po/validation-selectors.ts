import { ns } from "./commons"

export const textFieldSelector = {
  selector: {
    id: /.*textfield.*/,
    controlType: "sap.m.Input",
    viewName: `${ns}.view.App`
  }
}

export const textAreaSelector = {
  selector: {
    id: /.*textarea.*/,
    controlType: "sap.m.TextArea",
    viewName: `${ns}.view.App`
  }
}

export const numberSelector = {
  selector: {
    id: /.*number.*/,
    controlType: "sap.m.Input",
    viewName: `${ns}.view.App`
  }
}

export const dateSelector = {
  selector: {
    id: /.*datetime.*/,
    controlType: "sap.m.DatePicker",
    viewName: `${ns}.view.App`
  }
}

export const checkboxSelector = {
  selector: {
    id: /.*checkbox.*/,
    controlType: "sap.m.CheckBox",
    viewName: `${ns}.view.App`
  }
}

export const radioSelector = {
  selector: {
    id: /.*radio.*/,
    controlType: "sap.m.RadioButton",
    viewName: `${ns}.view.App`
  }
}

export const selectSelector = {
  selector: {
    id: /.*select.*/,
    controlType: "sap.m.Select",
    viewName: `${ns}.view.App`
  },
  interaction: "root"
}

export const buttonSelector = {
  selector: {
    id: /.*btnNextStep$/,
    viewName: `${ns}.view.App`
  }
}
