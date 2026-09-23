const TASK_LISTENER_TYPES = {
  "sap-tl-creating": "form",
  "sap-tl-completing-success": "final-task-success",
  "sap-tl-completing-fail": "final-task-fail"
}

const LEGACY_USER_TASK_TYPE = "io.camunda.zeebe:userTask"
const LEGACY_FINAL_TASK_HEADER = "final-user-task"

function getTaskListenerType(jobType) {
  return TASK_LISTENER_TYPES[jobType]
}

function getLegacyUserTaskType(customHeaders = {}) {
  switch (customHeaders[LEGACY_FINAL_TASK_HEADER]) {
    case "success":
      return "final-task-success"
    case "fail":
      return "final-task-fail"
    default:
      return "form"
  }
}

/**
 * Resolve the UI message type for both legacy job workers and task listeners.
 *
 * @param {string} jobType Zeebe job or task-listener type
 * @param {Record<string, string>} [customHeaders={}] job custom headers
 * @returns {string|undefined} the form or completion message type
 */
function getUserTaskType(jobType, customHeaders = {}) {
  const taskListenerType = getTaskListenerType(jobType)
  if (taskListenerType) return taskListenerType

  return jobType === LEGACY_USER_TASK_TYPE ? getLegacyUserTaskType(customHeaders) : undefined
}

module.exports = {
  TASK_LISTENER_TYPES,
  LEGACY_USER_TASK_TYPE,
  LEGACY_FINAL_TASK_HEADER,
  getTaskListenerType,
  getLegacyUserTaskType,
  getUserTaskType
}
