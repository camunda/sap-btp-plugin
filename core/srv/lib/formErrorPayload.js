function createFormRetrievalError(channelId, error) {
  return {
    type: "message",
    channelId,
    message: {
      text: "Error retrieving Form",
      description: "Camunda experienced a hiccup",
      additionalText: JSON.stringify(error),
      type: "Error"
    }
  }
}

module.exports = {
  createFormRetrievalError
}
