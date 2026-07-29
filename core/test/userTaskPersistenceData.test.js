const { getProcessInstanceCondition, createUserTaskEntry } = require("../srv/lib/userTaskPersistenceData")

describe("user task persistence data", () => {
  it("includes the parent process when resolving a browser client", () => {
    expect(getProcessInstanceCondition({ parentProcessInstanceKey: "parent" }, "child")).toEqual({
      in: ["child", "parent"]
    })
  })

  it("creates the persisted task entry from a Zeebe job", () => {
    const job = {
      processInstanceKey: "process",
      key: "job",
      customHeaders: { "io.camunda.zeebe:userTaskKey": "task" },
      formData: { schema: {} },
      variables: { channelId: "channel" }
    }

    expect(createUserTaskEntry(job, "channel", "alice")).toMatchObject({
      processInstanceKey: "process",
      channelId: "channel",
      user: "alice",
      jobKey: "job",
      userTaskKey: "task"
    })
  })
})
