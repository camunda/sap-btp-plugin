const approuter = require("@sap/approuter")()

approuter.beforeRequestHandler.use("/my-jwt", (req, res) => {
  res.end(req.session.user.token.accessToken)
})

approuter.start()
