const cds = require("@sap/cds")
const LOGGER = cds.log("worker:form-helper")
const retry = require("./retry")
const ws = require("@camunda8/websocket")

module.exports = {
  async loadAndSendForm(job, type) {
    const channelId = job.variables.channelId
    let form = ""
    try {
      /**
       * @type {import("@camunda8/sdk").Tasklist.TasklistApiClient}
       */
      const tl = await require("./camunda").getClient("tl")
      const promise = async () => {
        return tl.getForm(job.customHeaders["io.camunda.zeebe:formKey"], job.processDefinitionKey)
      }

      /**
       * @type {import("@camunda8/sdk").Tasklist.TasklistDto.Form}
       */
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

    ;(await ws.getClient()).send(JSON.stringify(wsData))
  }
}
