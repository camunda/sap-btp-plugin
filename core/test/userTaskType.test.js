const { getUserTaskType } = require("../srv/lib/userTaskType")

describe("user task type resolution", () => {
  it.each([
    ["sap-tl-creating", {}, "form"],
    ["sap-tl-completing-success", {}, "final-task-success"],
    ["sap-tl-completing-fail", {}, "final-task-fail"],
    ["io.camunda.zeebe:userTask", {}, "form"],
    ["io.camunda.zeebe:userTask", { "final-user-task": "success" }, "final-task-success"],
    ["io.camunda.zeebe:userTask", { "final-user-task": "fail" }, "final-task-fail"]
  ])("maps %s to %s", (jobType, customHeaders, expectedType) => {
    expect(getUserTaskType(jobType, customHeaders)).toBe(expectedType)
  })

  it("returns undefined for unsupported worker types", () => {
    expect(getUserTaskType("unsupported", {})).toBeUndefined()
  })
})
