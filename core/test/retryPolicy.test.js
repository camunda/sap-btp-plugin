const { createRetryPolicy } = require("../srv/lib/retryPolicy")

describe("retry policy", () => {
  it("allows retries through the configured maximum", () => {
    const policy = createRetryPolicy(2, 0)

    expect(policy.shouldRetry(1)).toBe(true)
    expect(policy.shouldRetry(2)).toBe(true)
    expect(policy.shouldRetry(3)).toBe(false)
  })

  it("increments retry attempts consistently", () => {
    expect(createRetryPolicy(1, 0).nextAttempt(4)).toBe(5)
  })
})
