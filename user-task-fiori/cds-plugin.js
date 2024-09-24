const cds = require("@sap/cds")
const LOGGER = cds.log("user-task-fiori")
const DEBUG = cds.log("user-task-fiori")._debug || process.env.DEBUG?.includes("camunda")

LOGGER.debug("plugin loaded!")
