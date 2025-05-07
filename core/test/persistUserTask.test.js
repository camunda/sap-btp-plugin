const { persistUserTask } = require("../srv/lib/persistUserTask")
const cds = require("@sap/cds")
const { expect } = cds.test()

process.env.DEBUG && jest.setTimeout(10000)

const { UserTasks, BrowserClients } = require("#cds-models/camunda")

describe("persist usertask data for later resuming of process", () => {
  it("uses the current PI key to retrieve the user from persistence", async () => {
    const mockJob = {
      variables: {},
      processInstanceKey: "processInstanceKey-19647670",
      key: "jobKey",
      formData: "formSchema"
    }
    const mockChannelId = "channelId-19647670"
    const { UserTasks, BrowserClients } = require("#cds-models/camunda")

    await persistUserTask({
      job: mockJob,
      channelId: mockChannelId,
      BrowserClients,
      UserTasks
    })

    const expected = {
      processInstanceKey: mockJob.processInstanceKey,
      channelId: mockChannelId,
      user: "user-18001376"
    }
    const result = await SELECT.from(UserTasks).where({ processInstanceKey: mockJob.processInstanceKey })
    expect(result.length).to.eql(1)
    expect(result[0].processInstanceKey).to.eql(expected.processInstanceKey)
    expect(result[0].channelId).to.eql(expected.channelId)
    expect(result[0].user).to.eql(expected.user)
    expect(result[0].formData).to.eql(mockJob.formData)
  })

  it("uses the parent process PI key to retrieve the user from persistence", async () => {
    const mockJob = {
      variables: { parentProcessInstanceKey: "parent-19647668" },
      processInstanceKey: "child-pid",
      key: "jobKey",
      formData: "formSchema"
    }
    const mockChannelId = "channelId-19647668"

    await persistUserTask({
      job: mockJob,
      channelId: mockChannelId,
      BrowserClients,
      UserTasks
    })

    const expected = {
      processInstanceKey: mockJob.processInstanceKey,
      channelId: mockChannelId,
      user: "user-19647668"
    }
    const result = await SELECT.from(UserTasks).where({ processInstanceKey: mockJob.processInstanceKey })
    expect(result.length).to.eql(1)
    expect(result[0].processInstanceKey).to.eql(expected.processInstanceKey)
    expect(result[0].channelId).to.eql(expected.channelId)
    expect(result[0].user).to.eql(expected.user)
    expect(result[0].formData).to.eql(mockJob.formData)
  })
})
