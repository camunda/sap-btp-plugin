const cds = require("@sap/cds")
const LOGGER = cds.log("inbound")
const _zbc = require("../lib/camunda")

const DEBUG = cds.log("inbound")._debug || process.env.DEBUG?.includes("inbound")

class InboundService extends cds.ApplicationService {
  //   init() {
  //     const generics = ["handle_crud"]
  //     for (let each of generics) this[each].call(this)
  //     return super.init()
  //   }

  static handle_crud() {
    this.on("POST", "Process", async (req) => {
      // trigger bpmn process execution
      DEBUG && LOGGER.debug("received: ", req.data)
      /**
       * @type {import("@camunda8/sdk").Zeebe.ZeebeGrpcClient}
       */
      const zbc = _zbc.getClient()
      try {
        let result
        if (!req.data.wait) {
          result = await zbc.createProcessInstance({
            bpmnProcessId: req.data.bpmnProcessId,
            user: req.user.id,
            variables: req.data.variables || {}
          })
          return { ...req.data, ...result }
        } else {
          result = await zbc.createProcessInstanceWithResult({
            bpmnProcessId: req.data.bpmnProcessId,
            user: req.user.id,
            variables: req.data.variables || {}
          })
          return { ...req.data, ...result }
        }
      } catch (err) {
        return req.reject(err.message || "")
      }
    })
    return super.handle_crud()
  }
}

module.exports = InboundService
