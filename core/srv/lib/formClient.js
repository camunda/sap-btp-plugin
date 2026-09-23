const retry = require("./retry")

async function loadForm(job) {
  const tasklist = await require("./camunda").getClient("tl")
  const formKey = job.customHeaders["io.camunda.zeebe:formKey"]

  return retry(() => tasklist.getForm(formKey, job.processDefinitionKey), 40, 300)
}

module.exports = {
  loadForm
}
