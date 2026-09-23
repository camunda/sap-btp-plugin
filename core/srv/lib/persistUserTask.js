const retry = require("./retry")
const { getProcessInstanceCondition, createUserTaskEntry } = require("./userTaskPersistenceData")

/**
 * Persist user task information for later retrieval
 * @param {object} params
 * @param {import("@camunda8/sdk/dist/zeebe/types.d.ts").Job} params.job - Zeebe job object
 * @param {string} params.channelId - Browser client channel id
 * @param {import("#cds-models/camunda").BrowserClients} params.BrowserClients - CAP model for BrowserClients
 * @param {import("#cds-models/camunda").UserTasks} params.UserTasks - CAP model for UserTasks
 */
async function persistUserTask({ job, channelId, BrowserClients, UserTasks }) {
  const condition = getProcessInstanceCondition(job.variables, job.processInstanceKey)

  // TODO: We should check the order of executions to avoid the race condition where the user task is persisted before the browser client record is created.
  await retry(
    async () => {
      // Get associated user for the user task
      const { user } = await SELECT.one`user`.from(BrowserClients).where({
        processInstanceKey: condition,
        channelId
      })

      // Persist user task for resuming (and eventually completing) later
      await UPSERT.into(UserTasks).entries(createUserTaskEntry(job, channelId, user))
    },
    5,
    2000
  )
}

module.exports = {
  persistUserTask
}
