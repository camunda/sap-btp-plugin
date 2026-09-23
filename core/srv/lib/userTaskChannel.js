function getChannelId(job) {
  return job.variables?.channelId
}

function hasChannelId(channelId) {
  return typeof channelId === "string" && channelId.length > 0
}

module.exports = {
  getChannelId,
  hasChannelId
}
