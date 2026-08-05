const cds = require("@sap/cds")
const LOGGER = cds.log("retry")
const DEBUG = cds.log("retry")._debug || process.env.DEBUG?.includes("retry")
const { createRetryPolicy } = require("./retryPolicy")

/**
 * retry an async $fn $maxAttempt times
 *
 * @param {Promise<Function>} fn async function to re-try @see maxAttempts times
 * @param {number} maxAttempts how often to retry
 * @param {number} waitFor time to wait between retries in ms
 * @returns {Promise<PromiseFulfilledResult|PromiseRejectedResult>} either the successfully resolved Promise or a rejection after @see maxAttempts
 */
module.exports = async (fn, maxAttempts, waitFor) => {
  const policy = createRetryPolicy(maxAttempts, waitFor)
  let attempt = 1

  while (true) {
    try {
      return await fn()
    } catch (err) {
      LOGGER.warn(`caught ${err} at attempt ${attempt}`)
      if (!policy.shouldRetry(attempt)) throw err

      const nextAttempt = policy.nextAttempt(attempt)
      DEBUG && LOGGER.debug(`waiting ${waitFor}ms ...`)
      await policy.wait()
      DEBUG && LOGGER.debug(`retrying the ${nextAttempt}. time ...`)
      attempt = nextAttempt
    }
  }
}
