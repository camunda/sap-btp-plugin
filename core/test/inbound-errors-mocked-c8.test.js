const cds = require("@sap/cds")
const { POST, expect } = cds.test()

jest.mock("../srv/lib/camunda", () => {})
process.env.DEBUG && jest.setTimeout(10000)

describe.skip("errors", () => {
  it("process definition not found", async () => {})
})
