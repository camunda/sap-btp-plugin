const cds = require("@sap/cds")
const LOGGER = cds.log("worker:user-task")
const DEBUG = cds.log("worker:user-task")._debug || process.env.DEBUG?.includes("worker:user-task")
const formHelper = require("./form")
const { getUserTaskType } = require("./userTaskType")
const { createUserTaskPersistenceError } = require("./userTaskError")

const ws = require("@camunda8/websocket")

const { persistUserTask } = require("./persistUserTask")

/**
 * @param {import("@camunda8/sdk/dist/zeebe/types.d.ts").Job} job
 * @param {import("@camunda8/sdk").Zeebe.ZBWorker} worker
 * @returns
 */
module.exports = async (job, worker) => {
  LOGGER.info("user task worker executing...")
  job.variables && LOGGER.info(`user task variables: ${JSON.stringify(job.variables)}`)

  const type = getUserTaskType(job.type, job.customHeaders)
  if (!type) LOGGER.error(`unknown worker type for job ${JSON.stringify(job)}`)
  const channelId = job.variables.channelId

  //> TODO: pass an instance of @camunda8/btp-plugin-core into here for canceling the process
  // bail out if no recipient (aka browser aka channel id) could be determined
  if (!channelId || channelId === "") {
    const msg = "No channel id provided -> can't continue!"
    LOGGER.error(msg)

    return job.fail(msg)
  }
  DEBUG && LOGGER.debug(`dedicated client channel: ${channelId}`)

  const { UserTasks, BrowserClients } = require("#cds-models/camunda")
  try {
    // send form data to the client via websocket
    await formHelper.loadAndSendForm(job, type)
    LOGGER.info(`sent form data for PI ${job.processInstanceKey}, channel ${channelId}`)

    // update user task
    await persistUserTask({
      job,
      channelId,
      BrowserClients,
      UserTasks
    })
    LOGGER.info(`persisted user task for PI ${job.processInstanceKey}, channel ${channelId}`)

    // forward the job (classic Job worker) (or complete worker for orchestration API in C8.8+ with Camunda User Tasks)
    return job.forward ? job.forward() : job.complete()
  } catch (err) {
    LOGGER.error(`error persisting user task for PI ${job.processInstanceKey}, channel ${channelId}:`, err)

    const wsPayload = createUserTaskPersistenceError(channelId, err)
    ;(await ws.getClient()).send(JSON.stringify(wsPayload))
    return job.fail(`error persisting user task for PI ${job.processInstanceKey}, channel ${channelId}`, 0)
  }
}
