const cds = require("@sap/cds")
const { POST, expect } = cds.test()

const mockedReturnObject = {
  bpmnProcessId: "myProcess",
  wait: true,
  variables: {
    myVar: "myValue",
    return_var: "returned value",
    feel_return_var: "2024-10-30T08:27:09.255@GMT"
  },
  processDefinitionKey: "2251799831560529",
  version: 1,
  processInstanceKey: "2251799831561189",
  tenantId: "<default>"
}

jest.mock("../lib/camunda", () =>
  Object.assign(
    {},
    {
      init() {},
      getClient(which = "zeebe") {
        if (which === "zeebe") {
          return {
            createProcessInstanceWithResult: async (req) => mockedReturnObject
          }
        }
      }
    }
  )
)
process.env.DEBUG && jest.setTimeout(10000)

describe("happy path - trigger process and wait for result", () => {
  it("minimal payload: should trigger bpmn process execution and wait for result", async () => {
    const { data } = await POST("/inbound/Process", {
      bpmnProcessId: "myProcess",
      wait: true
    })
    expect(data).to.contain({ bpmnProcessId: "myProcess" })
    expect(data).to.include.all.keys(
      "processDefinitionKey",
      "bpmnProcessId",
      "version",
      "processInstanceKey",
      "tenantId"
    )
    expect(data.variables).to.contain({ return_var: "returned value" })
    // date looks like 2024-10-30T08:27:09.255@GMT
    expect(data.variables["feel_return_var"]).to.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}@*/)
  })

  it("full payload: should trigger bpmn process execution and wait for result", async () => {
    const { data } = await POST("/inbound/Process", {
      bpmnProcessId: "myProcess",
      user: "myUser",
      variables: { myVar: "myValue" },
      wait: true
    })
    expect(data).to.contain({ bpmnProcessId: "myProcess", user: "myUser" })
    expect(data).to.include.all.keys(
      "processDefinitionKey",
      "bpmnProcessId",
      "version",
      "processInstanceKey",
      "tenantId"
    )
    expect(data.variables.myVar).to.eql("myValue")
    expect(data.variables).to.contain({ return_var: "returned value" })
    // date looks like 2024-10-30T08:27:09.255@GMT
    expect(data.variables["feel_return_var"]).to.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}@*/)
  })
})
