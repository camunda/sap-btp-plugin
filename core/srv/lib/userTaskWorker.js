const cds = require("@sap/cds")
const LOGGER = cds.log("worker:user-task")
const DEBUG = cds.log("worker:user-task")._debug || process.env.DEBUG?.includes("worker:user-task")

const ws = require("@camunda8/websocket")
const retry = require("./retry")

/**
 * @param {import("@camunda8/sdk/dist/zeebe/types.d.ts").Job} job
 * @param {import("@camunda8/sdk").Zeebe.ZBWorker} worker
 * @returns
 */
module.exports = async (job, worker) => {
  LOGGER.info("user task worker executing...")
  job.variables && LOGGER.info(`user task variables: ${JSON.stringify(job.variables)}`)

  const channelId = job.variables.channelId

  //> TODO: pass an instance of @camunda8/btp-plugin-core into here for canceling the process
  // bail out if no recipient (aka browser aka channel id) could be determined
  if (!channelId || channelId === "") {
    const msg = "No channel id provided -> can't continue!"
    LOGGER.error(msg)
    // throw new Error("No channel id provided -> can't continue!")
    // const zbc = require("./camundaCloud").getClient()
    // const jobToCancel = job.variables.parentProcessInstanceKey || job.processInstanceKey
    // LOGGER.info(`attempting to cancel process instance ${jobToCancel}...`)
    // try {
    //   await zbc.cancelProcessInstance(jobToCancel)
    //   LOGGER.info(`successfully cancelled process instance ${jobToCancel}!`)
    // } catch (err) {
    //   LOGGER.error(`couldn't cancel process instance ${jobToCancel}, b/c:`)
    //   LOGGER.error(err.message)
    // }
    // return job.complete()
    return job.fail(msg)
  }
  DEBUG && LOGGER.debug(`dedicated client channel: ${channelId}`)

  /**
   * @type {import("@camunda8/sdk").Tasklist.TasklistDto.Form}
   */
  let form = ""
  try {
    /**
     * @type {import("@camunda8/sdk").Tasklist.TasklistApiClient}
     */
    const tl = require("./camunda").getClient("tl")
    const promise = async () => {
      return tl.getForm(job.customHeaders["io.camunda.zeebe:formKey"], job.processDefinitionKey)
    }
    form = await retry(promise, 40, 300) //> max 12 sec
  } catch (err) {
    // this frequently happens when in the modelling layer,
    // the association btw user task service and form is cut/lost
    // -> display an error, cancel the process
    LOGGER.error(`error retrieving form: ${JSON.stringify(err)}`)

    const wsPayload = {
      type: "message",
      channelId,
      message: {
        text: "Error retrieving Form",
        description: "Camunda experienced a hiccup",
        additionalText: JSON.stringify(err),
        type: "Error"
      }
    }
    ;(await ws.getClient()).send(JSON.stringify(wsPayload))
    return job.fail(
      `error retrieving form with id ${job.customHeaders["io.camunda.zeebe:formKey"]} and process definition id ${job.processDefinitionKey}`,
      0
    )
  }
  LOGGER.info(`retrieved form data: ${form.schema}`)

  let type
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

  // send received json form data via websocket to UI layer for further processing
  const wsData = {
    channelId,
    type,
    jobKey: job.key, // this is the correlation id for sending the "complete job" signal to camunda later
    formData: form.schema,
    variables: job.variables
  }
  // "persist" parent process id for use in subprocess worker via global variable scope
  if (job.customHeaders.setProcessInstanceKey) {
    wsData.parentProcessInstanceKey = job.processInstanceKey
  }

  const { UserTasks, BrowserClients } = require("#cds-models/camunda")
  // if persisting the user task for later resuming fails, 
  // the error is relayed to the connected client and
  // the job is failed (to not mingle with eventual consistency)
  try {
    // get associated user for the user task
    const { user } = await SELECT.one`user`.from(BrowserClients).where({
      processInstanceKey: job.processInstanceKey,
      channelId
    })
    // persist user task for resuming (and eventually completing) later
    await UPSERT.into(UserTasks).entries({
      processInstanceKey: job.processInstanceKey,
      channelId,
      user,
      jobKey: job.key,
      formData: form.schema, //> we trust in CAP to serialize properly :)
      variables: job.variables //> we trust in CAP to serialize properly :)
    })
    LOGGER.info(`persisted user task for PI ${job.processInstanceKey}, channel ${channelId} and user ${user}`)
    ;(await ws.getClient()).send(JSON.stringify(wsData))

    // "queue" job completion
    // it will be completed via the UI Layer (form submit) and CAP layer (completeUsertask)
    return job.forward()
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
