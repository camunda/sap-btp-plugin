const cds = require("@sap/cds")
const { POST, expect } = cds.test()

jest.mock("../lib/camunda", () =>
  Object.assign(
    {},
    {
      init() {},
      getClient(which = "zeebe") {
        if (which === "zeebe") {
          return {
            createProcessInstance: async (req) => {
              return {
                bpmnProcessId: "myProcess",
                processDefinitionKey: 123,
                processInstanceKey: 456,
                version: 1,
                tenantId: "myTenant"
              }
            }
          }
        }
      }
    }
  )
)
process.env.DEBUG && jest.setTimeout(10000)

describe("happy path - trigger process only", () => {
  it("minimal payload: should trigger bpmn process execution", async () => {
    const { data } = await POST("/inbound/Process", {
      bpmnProcessId: "myProcess"
    })
    expect(data).to.contain({ bpmnProcessId: "myProcess" })
    expect(data).to.include.all.keys(
      "processDefinitionKey",
      "bpmnProcessId",
      "version",
      "processInstanceKey",
      "tenantId"
    )
  })

  it("full payload: should trigger bpmn process execution", async () => {
    const { data } = await POST("/inbound/Process", {
      bpmnProcessId: "myProcess",
      user: "myUser",
      variables: { myVar: "myValue" }
    })

    expect(data).to.contain({ bpmnProcessId: "myProcess", user: "myUser" })
    expect(data.variables).to.eql({ myVar: "myValue" })
    expect(data).to.include.all.keys(
      "processDefinitionKey",
      "bpmnProcessId",
      "version",
      "processInstanceKey",
      "tenantId"
    )
  })
})
