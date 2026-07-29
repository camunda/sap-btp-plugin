function getProcessInstanceCondition(variables, processInstanceKey) {
  return variables.parentProcessInstanceKey
    ? { in: [processInstanceKey, variables.parentProcessInstanceKey] }
    : processInstanceKey
}

function createUserTaskEntry(job, channelId, user) {
  return {
    processInstanceKey: job.processInstanceKey,
    channelId,
    user,
    jobKey: job.key,
    userTaskKey: job.customHeaders?.["io.camunda.zeebe:userTaskKey"],
    formData: job.formData,
    variables: job.variables
  }
}

module.exports = {
  getProcessInstanceCondition,
  createUserTaskEntry
}
