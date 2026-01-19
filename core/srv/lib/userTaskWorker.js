const cds = require("@sap/cds")
const LOGGER = cds.log("worker:user-task")
const DEBUG = cds.log("worker:user-task")._debug || process.env.DEBUG?.includes("worker:user-task")
const formHelper = require("./form")
const retry = require("./retry")

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

  let type
  switch (job.type) {
    case "sap-tl-creating":
      type = "form"
      break
    case "sap-tl-completing-success":
      type = "final-task-success"
      break
    case "sap-tl-completing-fail":
      type = "final-task-fail"
      break
    // legacy support for job workers using custom headers
    case "io.camunda.zeebe:userTask":
      switch (job.customHeaders["final-user-task"]) {
        case "success":
          type = "final-task-success"
          break
        case "fail":
          type = "final-task-fail"
          break
        default:
          type = "form"
      }
      break
    default:
      LOGGER.error(`unknown worker type for job ${JSON.stringify(job)}`)
  }
  const channelId = job.variables.channelId

  //> TODO: pass an instance of @camunda8/btp-plugin-core into here for canceling the process
  // bail out if no recipient (aka browser aka channel id) could be determined
  if (!channelId || channelId === "") {
    const msg = "No channel id provided -> can't continue!"
    LOGGER.error(msg)

    return job.fail(msg)
  }
  DEBUG && LOGGER.debug(`dedicated client channel: ${channelId}`)

  /**
   * @type {import("@camunda8/sdk").Tasklist.TasklistDto.Form}
   */
  const form = await formHelper.loadForm(job)

  // send received json form data via websocket to UI layer for further processing
  const wsData = {
    channelId,
    type,
    jobKey: job.key, // legacy: correlation id for gRPC completeJob
    userTaskKey: job.customHeaders["io.camunda.zeebe:userTaskKey"], // new: REST API expects user task key from custom headers (Camunda 8.8+)
    formData: form.schema,
    variables: job.variables
  }
  // "persist" parent process id for use in subprocess worker via global variable scope
  if (job.customHeaders.setProcessInstanceKey) {
    wsData.parentProcessInstanceKey = job.processInstanceKey
  }

  const { UserTasks, BrowserClients } = require("#cds-models/camunda")
  try {
    // update user task
    await persistUserTask({
      job: job,
      channelId,
      BrowserClients,
      UserTasks
    })
    LOGGER.info(`persisted user task for PI ${job.processInstanceKey}, channel ${channelId}`)

    // send form data to the client via websocket
    ;(await ws.getClient()).send(JSON.stringify(wsData))

    // forward the job (classic Job worker) (or complete worker for orchestration API in C8.8+ with Camunda User Tasks)
    return job.forward ? job.forward() : job.complete()
  } catch (err) {
    LOGGER.error(`error persisting user task for PI ${job.processInstanceKey}, channel ${channelId}:`, err)

    const wsPayload = {
      type: "message",
      channelId,
      message: {
        text: "Error persisting User Task",
        description: "Camunda experienced a hiccup",
        additionalText: JSON.stringify(err),
        type: "Error"
      }
    }
    ;(await ws.getClient()).send(JSON.stringify(wsPayload))
    return job.fail(`error persisting user task for PI ${job.processInstanceKey}, channel ${channelId}`, 0)
  }
}
