const cds = require("@sap/cds")
const LOGGER = cds.log("worker:form-helper")
const ws = require("@camunda8/websocket")
const { loadForm } = require("./formClient")
const { createFormPayload } = require("./formPayload")
const { createFormRetrievalError } = require("./formErrorPayload")

module.exports = {
  async loadAndSendForm(job, type) {
    const channelId = job.variables.channelId
    let form = ""
    try {
      form = await loadForm(job)
    } catch (err) {
      // this frequently happens when in the modelling layer,
      // the association btw user task service and form is cut/lost
      // -> display an error, cancel the process
      LOGGER.error(`error retrieving form: ${JSON.stringify(err)}`)

      const wsPayload = createFormRetrievalError(channelId, err)
      ;(await ws.getClient()).send(JSON.stringify(wsPayload))
      return job.fail(
        `error retrieving form with id ${job.customHeaders["io.camunda.zeebe:formKey"]} and process definition id ${job.processDefinitionKey}`,
        0
      )
    }
    LOGGER.info(`retrieved form data: ${form.schema}`)

    // send received json form data via websocket to UI layer for further processing
    const wsData = createFormPayload({ ...job, formData: form.schema }, type)

    ;(await ws.getClient()).send(JSON.stringify(wsData))
  }
}
