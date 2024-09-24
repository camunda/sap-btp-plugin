process.env.DEBUG?.includes("camunda") && require("debug").enable("camunda:*")

const cds = require("@sap/cds")
const LOGGER = cds.log("camunda")
const camunda = require("../lib/camunda")

LOGGER.info("started!")

cds.on("served", async () => !process.env.DISABLE_CAMUNDA && camunda.init())
cds.on("listening", function () {
  // ...
})

module.exports = cds.server
