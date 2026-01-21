const retry = require("./retry")

/**
 * Persist user task information for later retrieval
 * @param {object} params
 * @param {import("@camunda8/sdk/dist/zeebe/types.d.ts").Job} params.job - Zeebe job object
 * @param {string} params.channelId - Browser client channel id
 * @param {import("#cds-models/camunda").BrowserClients} params.BrowserClients - CAP model for BrowserClients
 * @param {import("#cds-models/camunda").UserTasks} params.UserTasks - CAP model for UserTasks
 */
async function persistUserTask({ job, channelId, BrowserClients, UserTasks }) {
  const condition = job.variables.parentProcessInstanceKey
    ? { in: [job.processInstanceKey, job.variables.parentProcessInstanceKey] }
    : job.processInstanceKey

  await retry(
    async () => {
      // Get associated user for the user task
      const { user } = await SELECT.one`user`.from(BrowserClients).where({
        processInstanceKey: condition,
        channelId
      })

      // Persist user task for resuming (and eventually completing) later
      await UPSERT.into(UserTasks).entries({
        processInstanceKey: job.processInstanceKey,
        channelId,
        user,
        jobKey: job.key,
        userTaskKey: job.customHeaders ? job.customHeaders["io.camunda.zeebe:userTaskKey"] : undefined,
        formData: job.formData, //> we trust in CAP to serialize properly :)
        variables: job.variables //> we trust in CAP to serialize properly :)
      })
    },
    5,
    2000
  )

}

module.exports = {
  persistUserTask
}
