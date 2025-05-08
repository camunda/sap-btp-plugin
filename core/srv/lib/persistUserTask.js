async function persistUserTask({ job, channelId, BrowserClients, UserTasks }) {
  const condition = job.variables.parentProcessInstanceKey
    ? { in: [job.processInstanceKey, job.variables.parentProcessInstanceKey] }
    : job.processInstanceKey

  // Get associated user for the user task
  const { user } = await SELECT.one`user`.from(BrowserClients).where({
    processInstanceKey: condition,
    channelId
  })

  // Persist user task for resuming (and eventually completing) later
  await UPSERT.into(UserTasks).entries({
    processInstanceKey: job.processInstanceKey,
    channelId,
    user,
    jobKey: job.key,
    formData: job.formData, //> we trust in CAP to serialize properly :)
    variables: job.variables //> we trust in CAP to serialize properly :)
  })
}

module.exports = {
  persistUserTask
}
