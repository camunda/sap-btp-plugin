function createFormPayload(job, type) {
  const payload = {
    channelId: job.variables.channelId,
    type,
    jobKey: job.key,
    userTaskKey: job.customHeaders["io.camunda.zeebe:userTaskKey"],
    formData: job.formData,
    variables: job.variables
  }

  if (job.customHeaders.setProcessInstanceKey) {
    payload.parentProcessInstanceKey = job.processInstanceKey
  }

  return payload
}

module.exports = {
  createFormPayload
}
