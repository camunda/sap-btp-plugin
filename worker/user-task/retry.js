const Logger = require("./log")("retry")
/**
 * retry an async $fn $maxAttempt times
 *
 * @param {Promise<Function>} fn async function to re-try @see maxAttempts times
 * @param {number} maxAttempts how often to retry
 * @returns {Promise<PromiseFulfilledResult|PromiseRejectedResult>} either the successfully resolved Promise or a rejection after @see maxAttempts
 */
module.exports = async (fn, maxAttempts) => {
  const execute = async (attempt) => {
    try {
      return await fn()
    } catch (err) {
      Logger.warn(`caught ${err} at attempt ${attempt}`)
      if (attempt <= maxAttempts) {
        const nextAttempt = attempt + 1
        Logger.warn(`retrying the ${nextAttempt}. time ...`)
        return execute(nextAttempt)
      } else {
        throw err
      }
    }
  }
  return execute(1)
}
