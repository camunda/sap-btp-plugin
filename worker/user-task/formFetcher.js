require("dotenv").config()
const Logger = require("./log")("formFetcher")
// const { log: Logger } = require("@sap/cds")
const Tokenizer = require("./Tokenizer")
const { default: axios } = require("axios")

// get oauth token from idp
// query tasklist api for form field content from user task
// pre-render form field content -> html form
// spit it to the client

// pure functions
function buildUrl({
  cluster = process.env.cc_cluster_region,
  clusterId = process.env.cc_cluster_id,
  parsedFormId,
  processDefinitionId
} = {}) {
  // const fqdn = `https://${cluster}.tasklist.camunda.io/${clusterId}`
  const fqdn = `http://localhost:8082`
  const url = `${fqdn}/v1/forms/${parsedFormId}?processDefinitionKey=${processDefinitionId}`
  return url
}

/**
 * get the raw (json) form data from Tasklist
 *
 * @param {string} formId id of the form embedded in the user task
 * @param {string} processDefinitionId id of the task in the bpmn model
 * @param {string} [accessToken] optional OAuth access token; if empty, will be retrieved on the fly
 *
 */

const getForm = async (formId, processDefinitionId, accessToken, processInstanceKey) => {
  const _accessToken = accessToken ? accessToken : await Tokenizer.getAccessToken()
  const requestHeaders = {
    authorization: `Bearer ${_accessToken}`,
    accept: "application/json"
  }

  // the form key looks like camundaForms:someotherBla:formKey
  // -> we need the last element "formKey" only
  let parsedFormId = formId.split(":").slice(-1)[0]
  if (formId.indexOf(":") === -1) {
    try {
      // const url = `https://${process.env.cc_cluster_region}.tasklist.camunda.io/${process.env.cc_cluster_id}/v1/tasks/search`
      const url = `http://localhost:8082/v1/tasks/search`
      const taskListEntry = await axios.post(
        url,
        {
          processDefinitionKey: processDefinitionId,
          processInstanceKey: processInstanceKey
        },
        {
          headers: requestHeaders
        }
      )
      parsedFormId = taskListEntry.data[0].formId
      if (taskListEntry.data.length > 1) {
        Logger.error("Error 1709822694803: Es wurde mehr als eine Form über die Tasklist API gefunden.")
        Logger.error(JSON.stringify(taskListEntry.data))
      }
    } catch (error) {
      Logger.error("Error 1709822624798: Die FormId aus Camunda konnte nicht aus der TaskList ermittelt werden.")
      const _errorMsg = typeof error === "string" ? error : JSON.stringify(error)
      Logger.error(_errorMsg)
    }
  }
  const builtUrl = buildUrl({ parsedFormId, processDefinitionId })

  const dataForm = await axios.get(builtUrl, {
    headers: requestHeaders
  })
  // form (json) data comes quoted as in
  // {   \"schemaVersion\": 2,   \"components\": ...
  const schema = JSON.parse(dataForm.data.schema)
  schema.components = schema.components.map((component) => {
    ;["text", "label"].forEach((property) => {
      if (component.hasOwnProperty(property)) {
        component[property] = component[property]
          .replace("\\", "")
          .replace(/(\\n)/g, "")
          .replace(/(\\r)/g, "")
          .replace(/(\\t)/g, "")
          .replace(/(\\f)/g, "")
          .replace(/(\\b)/g, "")
          .replace(/(\")/g, '"')
          .replace(/("{)/g, "{")
          .replace(/(}")/g, "}")
          .replace(/(\\)/g, "")
          .replace(/(\/)/g, "/")
      }
    })
    return component
  })
  return JSON.stringify(schema)
}

module.exports = {
  getForm,
  buildUrl
}
