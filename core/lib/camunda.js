const cds = require("@sap/cds")
const LOGGER = cds.log("camunda")
const { Camunda8 } = require("@camunda8/sdk")

const DEBUG = cds.log("camunda")._debug || process.env.DEBUG?.includes("camunda")

module.exports = Object.assign(
  {},
  {
    /**
     * @type {import("@camunda8/sdk").Camunda8}
     */
    _c8: null,
    /**
     * @type {import("@camunda8/sdk").Zeebe.ZeebeGrpcClient}
     */
    zeebe: null,
    /**
     * @type {import("@camunda8/sdk").Zeebe.ZeebeRestClient}
     */
    zeebeRest: null,
    /**
     * @type {import("@camunda8/sdk").Tasklist.TasklistApiClient}
     */
    tl: null,

    init() {
      if (!this.zeebe) {
        LOGGER.info("init'ing camunda client...")
        const callbacks = {
          onReady: () => {
            LOGGER.info("zeebe grpc client connected!")
          },
          onConnectionError: () => LOGGER.info("zeebe grpc client disconnected...")
        }
        this._c8 = new Camunda8()
        this.zeebe = this._c8.getZeebeGrpcApiClient()
        this.zeebe.onReady = callbacks.onReady
        this.zeebe.onConnectionError = callbacks.onConnectionError
        this.zeebeRest = this._c8.getZeebeRestClient()
        this.tl = this._c8.getTasklistApiClient()
        DEBUG &&
          this.zeebe.topology().then((topology) => {
            LOGGER.debug(JSON.stringify(topology, null, 2))
          })
      }
    },

    /**
     * get the instance of one of the camunda clients
     *
     * @param {"zeebe"|"zeebeRest"|"tl"} which client to return
     * @returns
     */
    getClient(which = "zeebe") {
      if (!this[which]) {
        LOGGER.info("no camunda client yet -> init'ing...")
        this.init()
      }
      return this[which]
    }
  }
)
