import express from 'express'
import bodyParser from 'body-parser'
import expressWinston from 'express-winston'
import winston from 'winston'

import configureContextStore from './context/mongo-context-store'

import fbMessageParser from './fb/fb-message-parser'
import configureFbMessageBuilder from './fb/fb-message-builder'

import configureReducer from './reducer'
import configureRenderer from './renderer'
import configureDispatcher from './dispatcher'

export default (configuration, logRequests) => {

  const contextStore = configureContextStore(configuration)

  const reducer = configureReducer(configuration)
  const renderer  = configureRenderer(configureFbMessageBuilder(configuration))
  const dispatch = configureDispatcher(contextStore, reducer, renderer, fbMessageParser)

  const app = configureApp(logRequests)
  app.get('/webhook', verifyChallenge)
  app.post('/webhook', processMessage(dispatch))

  return app
}

const verifyChallenge = (req, res) => {
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === configuration.verification_token) {
    res.send(req.query['hub.challenge'])
  } else {
    res.sendStatus(403)
  }
}

const processMessage = dispatch => {
  return (req, res) => {
    res.sendStatus(200)
    if (req.body.entry) combineMessages(req.body.entry).forEach(dispatch)
  }
}

const combineMessages = (entry) => {
  return entry.map(pageEntry => pageEntry.messaging)
    .reduce((a, b) => a.concat(b), [])
    .filter(messagingEvent => messagingEvent.message || messagingEvent.postback)
}

const configureApp = (logRequests) => {
  const app = express()
  app.use(bodyParser.json())

  if (logRequests) {
    expressWinston.requestWhitelist.push('body')
    app.use(expressWinston.logger({
      transports: [
        new winston.transports.Console({
          json: true,
          colorize: true
        })
      ]
    }))
  }

  return app
}
