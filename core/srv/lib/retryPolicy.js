function createRetryPolicy(maxAttempts, waitFor) {
  return {
    shouldRetry(attempt) {
      return attempt <= maxAttempts
    },

    nextAttempt(attempt) {
      return attempt + 1
    },

    async wait() {
      await new Promise((resolve) => setTimeout(resolve, waitFor))
    }
  }
}

module.exports = {
  createRetryPolicy
}
