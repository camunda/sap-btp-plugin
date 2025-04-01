const approuter = require("@sap/approuter")()
if (process.env.NODE_ENV === "localdev") { process.env.PORT = 5002 }
approuter.start()
