function createUserTaskPersistenceError(channelId, error) {
  return {
    type: "message",
    channelId,
    message: {
      text: "Error persisting User Task",
      description: "Camunda experienced a hiccup",
      additionalText: JSON.stringify(error),
      type: "Error"
    }
  }
}

module.exports = {
  createUserTaskPersistenceError
}
