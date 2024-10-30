const cds = require("@sap/cds")
const { POST, expect } = cds.test()

process.env.DEBUG && jest.setTimeout(10000)

//> until e2e test setup is in place
describe.skip("happy path - trigger process and wait for result", () => {
  it("minimal payload: should trigger bpmn process execution and wait for result", async () => {
    const { data } = await POST("/inbound/Process", {
      bpmnProcessId: "minimal-process-return",
      wait: true
    })

    expect(data).to.contain({ bpmnProcessId: "minimal-process-return" })
    expect(data.variables).to.contain({ return_var: "returned value" })
    // date looks like 2024-10-30T08:27:09.255@GMT
    expect(data.variables["feel_return_var"]).to.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}@*/)
  })

  it("full payload: should trigger bpmn process execution and wait for result", async () => {
    const { data } = await POST("/inbound/Process", {
      bpmnProcessId: "minimal-process-return",
      user: "myUser",
      variables: { myVar: "myValue" },
      wait: true
    })

    expect(data).to.contain({ bpmnProcessId: "minimal-process-return", user: "myUser" })
    expect(data.variables.myVar).to.eql("myValue")
    expect(data.variables).to.contain({ return_var: "returned value" })
    // date looks like 2024-10-30T08:27:09.255@GMT
    expect(data.variables["feel_return_var"]).to.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}@*/)
  })
})
