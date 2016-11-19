import express from 'express'
import bodyParser from 'body-parser'
import configureApi from './fb-api'
import expressWinston from 'express-winston'
import winston from 'winston'
import storyRunner from './story'

import configureYelp from './yelp-api'

export default (configuration, logRequests) => {

  const fbApi = configureApi({access_token: configuration.access_token})
  const yelpApi = configureYelp(configuration)

  const app = express()
  app.use(bodyParser.json())

  const runStory = storyRunner(fbApi.sendMessage, yelpApi.searchRestaurants)

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

  app.get('/webhook', (req, res) => {
    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === configuration.verification_token) {
      res.send(req.query['hub.challenge'])
    } else {
      res.sendStatus(403)
    }
  })

  app.post('/webhook', (req, res) => {
    res.sendStatus(200)
    if (req.body.entry) {
      req.body.entry.map(pageEntry => pageEntry.messaging)
        .reduce((a, b) => a.concat(b), [])
        .filter(messagingEvent => messagingEvent.message || messagingEvent.postback)
        .forEach(messagingEvent => runStory(messagingEvent))
    }
  })

  return app
}
