const LOGGER = cds.log("bpmn")
const cds = require("@sap/cds")
const _zbc = require("../lib/camunda")

const DEBUG = cds.log("bpmn")._debug || process.env.DEBUG?.includes("bpmn")

module.exports = async (bpmn) => {
  bpmn.on("run", async (req) => {
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
    const zbc = _zbc.getClient()
    const processVariables = JSON.parse(req.data.variables) || {}
    processVariables["channelId"] = channelId
    const result = await zbc.createProcessInstance({
      bpmnProcessId: req.data.bpmnProcessId,
      variables: processVariables
    })
    const { processDefinitionKey, bpmnProcessId, version, processInstanceKey, tenantId } = result

    await zbc.setVariables({
      elementInstanceKey: processInstanceKey,
      variables: {
        parentProcessInstanceKey: processInstanceKey
      }
    })

    // persist websocket client that triggered the bpmn process executions
    const { BrowserClients } = require("#cds-models/zeebe")
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
      tenantId
    })
    DEBUG && LOGGER.debug(`recording client on channel ${channelId} for bpmn process instance ${processInstanceKey}`)

    return {
      channelId,
      processInstanceKey,
      processDefinitionKey,
      version
    }
  })

  bpmn.on("completeUsertask", async (req) => {
    LOGGER.info(`completing user task w/ job ${req.data.jobKey} and vars ${JSON.stringify(req.data.variables)}`)
    const variables = JSON.parse(req.data.variables)
    const zbc = _zbc.getClient()
    try {
      // get historic basket position ID
      const { BasketPositionHistoric } = cds.entities("bdaas")
      const position = await SELECT.one.from(BasketPositionHistoric)
        .where`basket_basketID = ${req.data.bdaasBasketId} and positionId = ${req.data.bdaasBasketPositionId}`.orderBy(
        "modifiedAt desc"
      )
      const historicBasketPositionId = position.ID

      await bdaasHistorize.addQAToHistory(historicBasketPositionId, JSON.parse(req.data.qa))
    } catch (error) {
      const message = `Error 1674738344989: Could not historize data ${JSON.stringify(req.data)}`
      return req.error(500, message)
    }
    try {
      await zbc.completeJob({
        jobKey: req.data.jobKey,
        variables
      })
    } catch (err) {
      const message = `error completing user task w/ job ${req.data.jobKey} b/c of: ${JSON.stringify(err)}`
      LOGGER.error(message)
      return req.error(500, message)
    }
    return {}
  })
  const makeSureBasketExists = async function (basketId, basketName) {
    const { Basket } = cds.entities("bdaas")

    const baskets = await SELECT.from(Basket).where`basketID = ${basketId}`
    if (baskets.length === 0) {
      LOGGER.debug(`BDaaS DB: found no basket, inserting ${basketId}`)
      await INSERT.into(Basket, { basketId, basketName })
    } else {
      await UPDATE(Basket, basketId).with({ basketName, deleted: false })
    }
  }
}
