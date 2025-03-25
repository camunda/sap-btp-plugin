export interface BPMNformData {
  schemaVersion: number
  components: Component[]
  type: string
  id: string
  executionPlatform: string
  executionPlatformVersion: string
}

export interface Component {
  label: string
  type: ControlType
  id: string
  key: string
  values?: Value[]
  description?: string
  validate?: Validate
  properties?: Properties
  text?: string
  disabled?: boolean
  defaultValue?: boolean | string
  readonly?: boolean
  decimalDigits?: number
  appearance?: Appearance
  subtype?: "date" | "time" | "datetime"
  use24h?: boolean
  disallowPassedDates?: boolean
  source?: string //> img-view
  alt?: string //> img-view
  content?: string //> html-view
  conditional?: {
    hide: string //> FEEL string
  }
}

interface Appearance {
  prefixAdorner?: string
  suffixAdorner?: string
}

interface Validate {
  required: boolean
  minLength?: number
  maxLength?: number
  pattern?: string
  min?: number
  max?: number
  validationType?: "email" | "phone"
}

interface Value {
  label: string
  value: string
}

export enum SelectionModes {
  select = "select",
  valuehelp = "valuehelp"
}

export enum DynamicOutputTypes {
  default = "default",
  project = "project"
}

interface Properties {
  showDialog?: string | boolean
  enableSuggestion?: string | boolean
  type?: string
  for?: string
  suggestFields?: string
  outputType?: DynamicOutputTypes
  if?: string
  service?: string
  display?: string
  key?: string
  accountingValue?: string
  selectionMode?: SelectionModes
  quantity?: string
  sorter?: string
}

export enum CucumberType {
  textfield = "Text",
  radio = "Radio",
  number = "Text",
  select = "Select",
  datepicker = "Date",
  valuehelpinput = "ValueHelp",
  checkbox = "CheckBox"
}

export enum ControlType {
  Textfield = "textfield",
  Radio = "radio",
  Number = "number",
  Select = "select",
  DatePicker = "datetime",
  SmartField = "smartfield",
  ValueHelpInput = "valuehelpinput",
  DynamicSumInputAutomaic = "dynamicsuminputautomatic",
  DynamicSumAutomatic = "DynamicSumAutomatic",
  Text = "text",
  CheckBox = "checkbox",
  Summary = "summary",
  DynamicList = "dynamiclist",
  Textarea = "textarea",
  Image = "image",
  HTML = "html"
}

// for keeping track of auto-generated IDs and their type
export interface GeneratedControl {
  id: string
  question: string
  type: ControlType
  componentConfiguration: Component
}

// from the BPMN form
export interface SelectOption {
  label: string
  value: string
}

// from the BPMN form
export interface RadioButtonOption {
  label: string
  value: string
}

/**
 * unique identifier of a PACS run in DB,
 * as relayed by the "final task" worker
 */
export interface BasketInWebsocket {
  id: string
  subId: string
}

// only for TS UI5 scope to "know" about auto-generated
// add* method for aggregation
// export interface BPMNform {
//   addItem(control: Control): BPMNform
// }

// delivers the user-chosen values of a form element
// along with their key
export interface userFormData {
  key: string
  value: string | boolean
  question: string
  answer?: string
  linkedControlId: string
  linkedControlType: ControlType
}

// human readable equivalent of "userFormData"
export interface userQuestionAnswer {
  question: string
  answer?: string
  linkedControlId: string
  linkedControlType: ControlType
}
