const cds = require("@sap/cds")
const LOGGER = cds.log("worker:form-helper")
const retry = require("./retry")

module.exports = {
  async loadForm(job) {
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
    return form
  }
}
