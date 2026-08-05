const Duration = require("@camunda8/sdk").Zeebe.Duration

const DEFAULT_JOB_WORKER_OPTIONS = {
  maxJobsToActivate: 1,
  timeout: Duration.hours.of(2)
}

const DEFAULT_TASK_LISTENER_OPTIONS = {
  jobTimeoutMs: 15_000,
  maxParallelJobs: 10
}

function createJobWorkerOptions({ taskType, taskHandler, options = {} }) {
  return {
    taskType,
    taskHandler,
    longPoll: 45_000,
    ...DEFAULT_JOB_WORKER_OPTIONS,
    ...options
  }
}

function createTaskListenerWorkerOptions({ jobType, jobHandler, options = {} }) {
  return {
    jobType,
    jobHandler,
    ...DEFAULT_TASK_LISTENER_OPTIONS,
    ...options
  }
}

module.exports = {
  DEFAULT_JOB_WORKER_OPTIONS,
  DEFAULT_TASK_LISTENER_OPTIONS,
  createJobWorkerOptions,
  createTaskListenerWorkerOptions
}
