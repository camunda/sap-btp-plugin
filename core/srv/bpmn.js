const cds = require("@sap/cds")
const LOGGER = cds.log("bpmn")
const _zbc = require("./lib/camunda")

const DEBUG = cds.log("bpmn")._debug || process.env.DEBUG?.includes("bpmn")

module.exports = async (bpmn) => {
  bpmn.on("runProcess", async (req) => {
    const channelId = req.data.channelId
    // the channel id represents the individual client/browser running things
    // it is mandatory for driving push-channel based communication from Camunda Cloud to the client/browser UI
    if (!channelId || channelId === "") {
      const msg = "No channel id provided! BPMN execution can't continue!"
      LOGGER.error(msg)
      throw new Error(msg)
    }

    // trigger bpmn process execution
    DEBUG &&
      LOGGER.debug(`triggering process id ${req.data.bpmnProcessId} w/ vars ${JSON.stringify(req.data.variables)}`)
    /**
     * @type {import("@camunda8/sdk").Zeebe.ZeebeGrpcClient}
     */
    const zbc = await _zbc.getClient()
    let processVariables = {}
    if (req.data.variables) {
      processVariables = JSON.parse(req.data.variables)
    }
    processVariables["channelId"] = channelId

    let result
    try {
      result = await zbc.createProcessInstance({
        bpmnProcessId: req.data.bpmnProcessId,
        variables: processVariables
      })
    } catch (err) {
      const msg = `error starting process instance ${req.data.bpmnProcessId} b/c of: ${
        typeof err === "object" ? JSON.stringify(err, Object.getOwnPropertyNames(err)) : err
      }`
      LOGGER.error(msg)
      return req.error(500, msg)
    }
    const { processDefinitionKey, bpmnProcessId, version, processInstanceKey, tenantId } = result
    // persist websocket client that triggered the bpmn process executions
    const { BrowserClients } = require("#cds-models/camunda")
    // first make sure we're cleaning previous reference for that client/"channel"
    // use case: reloading the browser
    await DELETE.from(BrowserClients).where`channelId=${channelId}`
    // then store the association between the currently connected client and the process instance
    await INSERT.into(BrowserClients, {
      channelId,
      processDefinitionKey,
      bpmnProcessId,
      version,
      processInstanceKey,
      tenantId,
      user: req.user.id || "anonymous"
    })
    DEBUG && LOGGER.debug(`recording client on channel ${channelId} for bpmn process instance ${processInstanceKey}`)

    await zbc.setVariables({
      elementInstanceKey: processInstanceKey,
      variables: {
        parentProcessInstanceKey: processInstanceKey
      }
    })

    return {
      channelId,
      processInstanceKey,
      processDefinitionKey,
      version
    }
  })

  bpmn.on("completeUsertask", async (req) => {
    LOGGER.info(
      `completing user task w/ job ${req.data.jobKey}/${req.data.userTaskKey} and vars ${JSON.stringify(req.data.variables)}`
    )
    const variables = JSON.parse(req.data?.variables || "{}")
    try {
      const zbc = await _zbc.getClient()
      const orchestration = await _zbc.getClient("orchestration")
      const gatewayVersion = (await zbc.topology()).gatewayVersion
      const { UserTasks } = require("#cds-models/camunda")
      DEBUG && LOGGER.debug(`gateway version: ${gatewayVersion}`)

      // For all versions: use completeJob with job key
      if (req.data.jobKey) {
        DEBUG && LOGGER.debug(`completing job with key: ${req.data.jobKey}`)
        await zbc.completeJob({
          jobKey: req.data.jobKey,
          variables
        })

        await DELETE.from(UserTasks).where({ jobKey: req.data.jobKey })
        LOGGER.info(`successfully completed (c8) and deleted (db) user task w/ job ${req.data.jobKey}`)
      } else if (req.data.userTaskKey) {
        // For user tasks: use the orchestration client to complete the user task by its user task key
        DEBUG && LOGGER.debug(`completing user task with key: ${req.data.userTaskKey}`)
        await orchestration.completeUserTask({
          userTaskKey: req.data.userTaskKey,
          variables
        })

        await DELETE.from(UserTasks).where({ userTaskKey: req.data.userTaskKey })
        LOGGER.info(
          `successfully completed (c8) and deleted (db) user task w/ camunda user task ${req.data.userTaskKey}`
        )
      }
    } catch (err) {
      const message = `error completing process with userTask ${req.data.userTaskKey} and jobKey ${req.data.jobKey} b/c of: ${
        typeof err === "object" ? JSON.stringify(err, Object.getOwnPropertyNames(err)) : err
      }`
      LOGGER.error(message)
      DEBUG && LOGGER.debug(`full error: ${JSON.stringify(err)}`)
      return req.error(500, message)
    }
    return {}
  })

  /**
   * a clean up operation: remove any client/UI association with a process instance
   */
  bpmn.on("deleteChannel", async (req) => {
    const channelId = req.data.channelId
    LOGGER.info(`deleting channel ${channelId}`)
    const { BrowserClients } = require("#cds-models/camunda")
    await DELETE.from(BrowserClients).where({ channelId })
    return {}
  })
}
