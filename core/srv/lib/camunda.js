const cds = require("@sap/cds")
const LOGGER = cds.log("camunda")
const { Camunda8 } = require("@camunda8/sdk")
const createCamundaOrchestrationApiClient = require("@camunda8/orchestration-cluster-api").createCamundaClient
const Duration = require("@camunda8/sdk").Zeebe.Duration
const userTaskWorker = require("./userTaskWorker")

const DEBUG = cds.log("camunda")._debug || process.env.DEBUG?.includes("camunda")

module.exports = Object.assign(
  {},
  {
    orchestration: null,

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

    topology: null,

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
        this.orchestration = createCamundaOrchestrationApiClient()

        this.zeebeRest = this._c8.getCamundaRestClient()

        this.tl = this._c8.getTasklistApiClient()
        DEBUG &&
          this.zeebe.topology().then((topology) => {
            LOGGER.debug(JSON.stringify(topology, null, 2))
          })
      }
    },

    async registerWorker() {
      await this._createJobWorker("io.camunda.zeebe:userTask", userTaskWorker, "job worker")
      
      const topology = await this.zeebe.topology()
      if (topology.gatewayVersion > "8.8") {
        await Promise.all([
          this._createTaskListenerWorker(
            "sap-tl-creating",
            userTaskWorker,
            "camunda user task worker for creating jobs"
          ),
          this._createTaskListenerWorker(
            "sap-tl-completing-success",
            userTaskWorker,
            "camunda user task worker for completing jobs"
          ),
          this._createTaskListenerWorker(
            "sap-tl-completing-fail",
            userTaskWorker,
            "camunda user task worker for completing jobs"
          )
        ])
      }
    },

    /**
     * generic worker function to register task listeners in camunda orchestration
     *
     * @param {string} jobType identifier for the job. Has to be equal to registered "Listener type" value in Task listener in camunda modeller
     * @param {function} jobHandler worker function, when listener has executed
     * @param {string} description human readable worker description for loggin
     */
    async _createTaskListenerWorker(jobType, jobHandler, description = "") {
      LOGGER.info(`creating orchestration worker "${jobType}" ${description ? "for " + description : description} ...`)
      const orchestration = await this.getClient("orchestration")
      await orchestration.createJobWorker({
        jobType,
        jobHandler,
        jobTimeoutMs: 15_000,
        maxParallelJobs: 10
      })
    },

    /**
     * generic create worker function, that registers the system task in camunda
     *
     * @param {string} taskType identifier for the task
     * @param {function} taskHandler Worker function, when task is called
     * @param {string} description human readable worker description to describe task, when worker is connected
     * @param {object} options additional options, that extend or may override the options in zeebeeclient`s createWorker function
     */
    async _createJobWorker(
      taskType,
      taskHandler,
      description = "",
      options = {
        maxJobsToActivate: 1,
        timeout: Duration.hours.of(2) /* give the task handler 2 hrs to complete the job... */
      }
    ) {
      LOGGER.info(`creating worker "${taskType}" ${description ? "for " + description : description} ...`)
      const client = await this.getClient()
      const worker = /** @type {import("@camunda8/sdk").Zeebe.ZeebeGrpcClient}  */ (client).createWorker({
        taskType,
        taskHandler,
        longPoll: 45000,
        ...options
      })
      worker.on("ready", () => LOGGER.info(`worker "${taskType}" connected!`))
      worker.on("connectionError", () => LOGGER.info(`worker "${taskType}" disconnected...`))
      worker.on("close", () => LOGGER.info(`worker "${taskType}" closed...`))
      worker.on("unknown", () => LOGGER.info(`worker "${taskType}": unknown!!!`))
    },

    /**
     * get the instance of one of the camunda clients
     *
     * @param {"zeebe"|"zeebeRest"|"tl"} which client to return
     * @returns
     */
    async getClient(which = "zeebe") {
      if (!this[which]) {
        LOGGER.info("no camunda client yet -> init'ing...")
        await this.init()
      }
      return this[which]
    }
  }
)
