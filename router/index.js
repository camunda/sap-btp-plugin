if (process.env.NODE_ENV === "localdev") {
  delete process.env.destinations //> to make sure we only use destinations from default-env.json
}
const approuter = require("@sap/approuter")()

approuter.beforeRequestHandler.use("/my-jwt", (req, res) => {
  res.end(req.session.user.token.accessToken)
})

approuter.start()
