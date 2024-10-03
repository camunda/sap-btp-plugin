const cds = require("@sap/cds")
const LOGGER = cds.log("woker:user-task")
const DEBUG = cds.log("worker:user-task")._debug || process.env.DEBUG?.includes("worker:user-task")

const { getForm } = require("./formFetcher")
const ws = require("@camunda/websocket")
// const msteams = require("./msteams")
const retry = require("./retry")
const { message } = require("@sap/cds/lib/log/cds-error")

/**
 * @param {import("@camunda8/sdk/dist/zeebe/types.d.ts").Job} job
 * @param {import("@camunda8/sdk").Zeebe.ZBWorker} worker
 * @returns
 */
module.exports = async (job, worker) => {
  LOGGER.info("user task worker executing...")
  job.variables && LOGGER.info(`user task variables: ${JSON.stringify(job.variables)}`)


  const channelId = job.variables.channelId

  //> TODO: pass an instance of @camunda/btp-integration-core into here for canceling the process
  // bail out if no recipient (aka browser aka channel id) could be determined
  if (!channelId || channelId === "") {
    const msg = msg
    LOGGER.error("No channel id provided -> can't continue!")
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
  LOGGER.debug(`dedicated client channel: ${channelId}`)

  let formData = ""
  // try to retrieve the form 3 times via the Camunda Tasklist graphql api
  // if still unsuccessful -> axe the process
  try {
    const promise = async () => {
      return getForm(
        job.customHeaders["io.camunda.zeebe:formKey"],
        job.processDefinitionKey,
        undefined,
        job.processInstanceKey
      )
    }
    formData = await retry(promise, 3)
  } catch (err) {
    // this frequently happens when in the modelling layer,
    // the association btw user task service and form is cut/lost
    // -> display an error, cancel the process
    LOGGER.error(`error retrieving form: ${JSON.stringify(err)}`)

    const wsPayload = {
      type: "message",
      channelId,
      message: {
        text: "Fehler Abruf Eingabeformular",
        description: "Camunda",
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
  LOGGER.info(`retrieved form data: ${formData}`)

  // send received json form data via websocket to UI layer for further processing
  const wsData = {
    channelId,
    type: "form",
    jobKey: job.key, // this is the correlation id for sending the "complete job" signal to camunda later
    formData,
    variables: job.variables
  }
  // "persist" parent process id for use in subprocess worker via global variable scope
  if (job.customHeaders.setProcessInstanceKey) {
    wsData.parentProcessInstanceKey = job.processInstanceKey
  }

  ;(await ws.getClient()).send(JSON.stringify(wsData))

  // "queue" job completion
  // it will be completed via the UI Layer (form submit) and CAP layer (completeUsertask)
  return job.forward()
}
