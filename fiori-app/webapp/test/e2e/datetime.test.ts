import _ui5Service from "wdio-ui5-service"
const ui5Service = new _ui5Service()

import { ns, mockIndex, formTarget } from "./po/commons"
import DatePicker from "sap/m/DatePicker"
import TimePicker from "sap/m/TimePicker"
import DateTimePicker from "sap/m/DateTimePicker"

function pad(num: number) {
  return num.toString().padStart(2, "0")
}

function getRandom(type: "date" | "time12h" | "time24h" | "datetime12h" | "datetime24h"): string {
  const start = new Date(1999, 0, 1)
  const end = new Date(2030, 11, 31)
  const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime())
  const randomDate = new Date(randomTime)
  const year = randomDate.getFullYear()
  const month = pad(randomDate.getMonth() + 1)
  const day = pad(randomDate.getDate())

  switch (type) {
    case "date": {
      return `${year}-${month}-${day}`
    }
    case "time12h": {
      const hour = pad(Math.floor(Math.random() * 12) + 1)
      const minute = pad(Math.floor(Math.random() * 60))
      const second = pad(Math.floor(Math.random() * 60))
      const period = Math.random() < 0.5 ? "AM" : "PM"
      return `${hour}:${minute}:${second} ${period}`
    }
    case "time24h": {
      const hour = pad(Math.floor(Math.random() * 24))
      const minute = pad(Math.floor(Math.random() * 60))
      const second = pad(Math.floor(Math.random() * 60))
      return `${hour}:${minute}:${second}`
    }
    case "datetime12h": {
      const hour = pad(Math.floor(Math.random() * 12) + 1)
      const minute = pad(Math.floor(Math.random() * 60))
      const second = pad(Math.floor(Math.random() * 60))
      const period = Math.random() < 0.5 ? "AM" : "PM"
      return `${year}-${month}-${day}T${hour}:${minute}:${second} ${period}`
    }
    case "datetime24h": {
      const hour = pad(Math.floor(Math.random() * 24))
      const minute = pad(Math.floor(Math.random() * 60))
      const second = pad(Math.floor(Math.random() * 60))
      return `${year}-${month}-${day}T${hour}:${minute}:${second}`
    }
    default: {
      throw new Error("Invalid type")
    }
  }
  throw new Error("Invalid type")
}

describe("datetime input", () => {
  before(async () => {
    await browser.goTo(mockIndex())
    await ui5Service.injectUI5()
    // target the form containing datetime elements
    await formTarget("datetime-8.6")
    await browser.screenshot("before-datetime-input")
  })

  beforeEach(async () => {
    await browser.screenshot("before-each-datetime-input")
  })

  it("basic rendering for date subtype", async () => {
    const dateSelector = {
      selector: {
        id: /.*datetime_date$/,
        controlType: "sap.m.DatePicker",
        viewName: `${ns}.view.App`
      }
    }
    const dateControl = await browser.asControl<DatePicker>(dateSelector)
    const valueFormat = await dateControl.getValueFormat()
    expect(valueFormat).toBe("yyyy-MM-dd")

    const testDate = getRandom("date")
    await dateControl.setValue(testDate)
    const enteredValue = await dateControl.getValue()
    expect(enteredValue).toBe(testDate)
  })

  it("basic rendering for time input (12h)", async () => {
    const time12hSelector = {
      selector: {
        id: /.*datetime_time_12h$/,
        controlType: "sap.m.TimePicker",
        viewName: `${ns}.view.App`
      }
    }
    const tp = await browser.asControl<TimePicker>(time12hSelector)
    const valueFormat = await tp.getValueFormat()
    expect(valueFormat).toBe("hh:mm:ss aa")

    const testTime = getRandom("time12h")
    await tp.setValue(testTime)
    const enteredTime = await tp.getValue()
    expect(enteredTime).toBe(testTime)
  })

  it("basic rendering for time input (24h)", async () => {
    const time24hSelector = {
      selector: {
        id: /.*datetime_time_24h$/,
        controlType: "sap.m.TimePicker",
        viewName: `${ns}.view.App`
      }
    }
    const tp = await browser.asControl<TimePicker>(time24hSelector)
    const valueFormat = await tp.getValueFormat()
    expect(valueFormat).toBe("HH:mm:ss")

    const testTime = getRandom("time24h")
    await tp.setValue(testTime)
    const enteredTime = await tp.getValue()
    expect(enteredTime).toBe(testTime)
  })

  it("basic rendering for datetime (12h)", async () => {
    // new utility function for generating random values

    const dt12hSelector = {
      selector: {
        id: /.*datetime_date_time_12h$/,
        controlType: "sap.m.DateTimePicker",
        viewName: `${ns}.view.App`
      }
    }
    const dtp = await browser.asControl<DateTimePicker>(dt12hSelector)
    const valueFormat = await dtp.getValueFormat()
    expect(valueFormat).toBe("yyyy-MM-ddThh:mm:ss aa")

    const testDateTime = getRandom("datetime12h")
    await dtp.setValue(testDateTime)
    const enteredDateTime = await dtp.getValue()
    expect(enteredDateTime).toBe(testDateTime)
  })

  it("basic rendering for datetime (24h)", async () => {
    const dt24hSelector = {
      selector: {
        id: /.*datetime_date_time_24h$/,
        controlType: "sap.m.DateTimePicker",
        viewName: `${ns}.view.App`
      }
    }
    const dtp = await browser.asControl<DateTimePicker>(dt24hSelector)
    const valueFormat = await dtp.getValueFormat()
    expect(valueFormat).toBe("yyyy-MM-ddTHH:mm:ss")

    const testDateTime = getRandom("datetime24h")
    await dtp.setValue(testDateTime)
    const enteredDateTime = await dtp.getValue()
    expect(enteredDateTime).toBe(testDateTime)
  })

  it("validate disabled state", async () => {
    const disabledSelector = {
      selector: {
        id: /.*datetime_disabled$/,
        controlType: "sap.m.DatePicker",
        viewName: `${ns}.view.App`
      }
    }
    const dp = await browser.asControl<DatePicker>(disabledSelector)
    const enabled = await dp.getEnabled()
    expect(enabled).toBe(false)
  })

  it("validate static read-only state", async () => {
    const roStaticSelector = {
      selector: {
        id: /.*datetime_read_only_static$/,
        controlType: "sap.m.DatePicker",
        viewName: `${ns}.view.App`
      }
    }
    const dp = await browser.asControl<DatePicker>(roStaticSelector)
    const editable = await dp.getEditable()
    expect(editable).toBe(false)
  })

  it("validate feel-assigned read-only state", async () => {
    const roFeelSelector = {
      selector: {
        id: /.*datetime_read_only_feel$/,
        controlType: "sap.m.DatePicker",
        viewName: `${ns}.view.App`
      }
    }
    const dp = await browser.asControl<DatePicker>(roFeelSelector)
    const editable = await dp.getEditable()
    expect(editable).toBe(false)
  })

  it("should disallow passed dates", async () => {
    const dpSelector = {
      selector: {
        id: /.*datetime_disallow_past_dates$/,
        controlType: "sap.m.DatePicker",
        viewName: `${ns}.view.App`
      }
    }
    const dp = await browser.asControl<DatePicker>(dpSelector)
    const _minDate = await dp.getMinDate()
    const minDate = await _minDate.toString()
    expect(minDate).toBeDefined()
    
    const today = new Date().toDateString()
    expect(new Date(minDate).toDateString()).toBe(today)
  })

  it("validate required field", async () => {
    const reqSelector = {
      selector: {
        id: /.*datetime_required$/,
        controlType: "sap.m.DatePicker",
        viewName: `${ns}.view.App`
      }
    }
    const dp = await browser.asControl<DatePicker>(reqSelector)
    const required = await dp.getRequired()
    expect(required).toBe(true)
  })
})
