const cds = require("@sap/cds")
const LOGGER = cds.log("retry")
/**
 * retry an async $fn $maxAttempt times
 *
 * @param {Promise<Function>} fn async function to re-try @see maxAttempts times
 * @param {number} maxAttempts how often to retry
 * @param {number} waitFor time to wait between retries in ms
 * @returns {Promise<PromiseFulfilledResult|PromiseRejectedResult>} either the successfully resolved Promise or a rejection after @see maxAttempts
 */
module.exports = async (fn, maxAttempts, waitFor) => {
  const execute = async (attempt) => {
    try {
      return await fn()
    } catch (err) {
      LOGGER.warn(`caught ${err} at attempt ${attempt}`)
      if (attempt <= maxAttempts) {
        const nextAttempt = attempt + 1
        LOGGER.debug(`waiting ${waitFor}ms ...`)
        await new Promise((resolve) => setTimeout(resolve, waitFor))
        LOGGER.debug(`retrying the ${nextAttempt}. time ...`)
        return execute(nextAttempt)
      } else {
        throw err
      }
    }
  }
  return execute(1)
}
