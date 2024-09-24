const cds = require("@sap/cds")
const LOGGER = cds.log("websocket", { level: "debug" })
// eslint-disable-next-line no-undef
const DEBUG = cds.log("websocket")._debug || process.env.DEBUG?.includes("camunda")

const { WebSocket } = require("ws")
const { URL } = require("url")

LOGGER.debug("plugin loaded!")
/**
 * abstract Websocket Server and Client api from "ws"
 */
class _ {
  /**
   * create a websocket server on top of an existing http(s) server
   *
   * @param {import("http").Server|import("https").Server} listeningHttpServer
   * @param {number} [heartbeatInterval=30000] time in ms to run inventory on connected clients
   * @returns {WebSocketServer}
   */
  createServer(listeningHttpServer, heartbeatInterval = 30000) {
    if (!this.wss) {
      this.wss = new WebSocket.Server({ clientTracking: true, server: listeningHttpServer })
      this.wss.on("connection", (ws, req) => {
        // attach the unique channelId supplied by the client
        // to the ws client tracker
        // to enable client-specific pushing of messages
        LOGGER.info(`connection to ${req.url}`)
        const found = req.url.match(/channel\/(?<channelId>.*)/)
        if (found?.groups?.channelId) {
          ws.channelId = found.groups.channelId
        }

        // heartbeat response
        // allowing for clean-up of stale clients
        ws.isAlive = true
        ws.on("pong", function () {
          LOGGER.debug(`<// '${ws.channelId || "ws w/o channelId"}' heartbeat back`)
          this.isAlive = true
        })

        ws.on("message", (data, isBinary = false) => {
          LOGGER.debug(`received ${data.toString()}`)
          LOGGER.debug(`total ws clients: ${this.wss.clients.size}`)
          // send message to dedicated client only (incl except itself)
          let _data
          try {
            _data = JSON.parse(data) // de-serialize
          } catch (e) {
            LOGGER.error(`not JSON: ${e}`)
            _data = data
          }
          this.wss.clients.forEach((client) => {
            if (client !== ws && client.channelId === _data.channelId && client.readyState === WebSocket.OPEN) {
              LOGGER.debug(`sending data for channelId '${_data.channelId}' to client '${client.channelId}'`)
              client.send(data, { binary: isBinary })
            }
          })
        })
        ws.on("close", (code, reason) => {
          LOGGER.debug(`closing websocket w/ code ${code} for reason ${reason.toString()}`)
          LOGGER.debug(`total ws clients: ${this.wss.clients.size}`)
        })
      })

      // heartbeat lifeline routine
      const interval = setInterval(() => {
        this.wss.clients.forEach((client) => {
          LOGGER.debug(`//> heartbeat to '${client.channelId || "ws w/o channelId"}'`)
          if (client.isAlive === false) {
            LOGGER.info(`terminating client '${client.channelId || "ws w/o channelId"}'`)
            client.terminate()
          }
          client.isAlive = false // assume dead
          client.ping() // try heartbeat to revive
        })
      }, heartbeatInterval)
      this.wss.on("close", () => {
        LOGGER.info("shutting down, also stopping heartbeat")
        clearInterval(interval)
      })
    }
    return this.wss
  }

  /**
   * permanently open a websocket client
   *
   * @returns {Promise} resolved with the instance of this class or rejected in case of an error
   */
  async getClient() {
    return new Promise((resolve, reject) => {
      if (!this.wss) {
        reject("no Websocket Server active...can't init a client!")
      }
      if (!this.ws) {
        // ssl websockets only on deployment
        const protocol = process.env.PROD || process.env.QA || process.env.DEV ? "wss" : "ws"
        LOGGER.info(`ws address: ${JSON.stringify(this.wss.address())}`)
        let { address: _address, port } = this.wss.address()
        let address = _address || "::"
        // ws module delivers "::" for local websocket server,
        // and URL module needs square brackets wrapped for that
        if (address.includes("::")) {
          address = `[${address}]`
        }
        const url = new URL(`${protocol}://${address}:${port}`)
        // create and open a persistent websocket client
        this.ws = new WebSocket(url)
        this.ws.on("open", () => {
          resolve(this.ws)
        })
        this.ws.on("close", (code, reason) => {
          LOGGER.debug(`closing websocket w/ code ${code} for reason ${reason.toString()}`)
        })
        this.ws.on("error", (err) => {
          LOGGER.debug(err)
        })
      } else {
        resolve(this.ws)
      }
    })
  }
}

// singleton - make use of node's cjs module caching and
// export only the one instance of the class
module.exports = new _()
