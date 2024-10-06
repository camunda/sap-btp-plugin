
const cds = require("@sap/cds")
const LOGGER = cds.log("camunda")
const { Camunda8 } = require("@camunda8/sdk")
const Duration  = require("@camunda8/sdk").Zeebe.Duration

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
            this.registerWorker()
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

    registerWorker() {
      this._createWorker("io.camunda.zeebe:userTask", require("@camunda8/user-task-worker"), "user task worker")
    },

    /**
     * generic create worker function, that registers the system task in camunda
     *
     * @param {string} taskType identifier for the task
     * @param {function} taskHandler Worker function, when task is called
     * @param {string} description human readable worker description to describe task, when worker is connected
     * @param {object} options additional options, that extend or may override the options in zeebeeclient`s createWorker function
     */
    _createWorker(taskType, taskHandler, description = "", options = { maxJobsToActivate: 1, timeout: Duration.hours.of(2) /* give the task handler 2 hrs to complete the job... */ }) {
      LOGGER.info(`creating worker "${taskType}" ${description ? "for " + description : description} ...`)
      const worker = /** @type {import("@camunda8/sdk").Zeebe.ZeebeGrpcClient}  */ (this.getClient()).createWorker({
        taskType,
        taskHandler,
        ...options
      })
      worker.on("ready", () => LOGGER.info(`Worker "${taskType}" connected!`))
      worker.on("connectionError", () => LOGGER.info(`Worker "${taskType}" disconnected...`))
      worker.on("close", () => LOGGER.info(`Worker "${taskType}" closed...`))
      worker.on("unknown", () => LOGGER.info(`Worker "${taskType}": unknown!!!`))
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
