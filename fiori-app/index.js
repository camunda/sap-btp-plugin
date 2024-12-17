const approuter = require("@sap/approuter")()
if (process.env.NODE_ENV === "localdev") { process.env.PORT = 5500 }
approuter.start()
