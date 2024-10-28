const cds = require("@sap/cds")
const { POST, expect } = cds.test()

jest.mock("../lib/camunda")
process.env.DEBUG && jest.setTimeout(10000)

describe.skip("happy path - trigger process and wait for result", () => {
  it("minimal payload: should trigger bpmn process execution and wait for result", async () => {
    const { data } = await POST("/inbound/process", {
      bpmnProcessId: "myProcess",
      wait: true
    })
  })

  it("full payload: should trigger bpmn process execution and wait for result", async () => {
    const { data } = await POST("/inbound/process", {
      bpmnProcessId: "myProcess",
      user: "myUser",
      variables: { myVar: "myValue" },
      wait: true
    })
  })
})
