import processor from './processor'
import configureYelp from './api/yelp-api'

export default configuration => {
  const yelpApi = configureYelp(configuration)

  return (context, incomingMessage) => {

    const showNextSet = context => {
      if (context.session.hitIndex <= 2) {

        const selected = Array(3).fill(null).map(_ => processor.pickRandom(context.session.results.restaurants))
        const items = selected.map(restaurant => processor.mapRestaurant(restaurant, context.location, true))

        context.session.nextSet = items

        return context
      }
      else {
        const selected = processor.pickRandom(context.session.results.restaurants)
        context.session.selected = processor.mapRestaurant(selected, context.location, false)
        context.session.final = true
      }

      return context
    }

    const handleLunch = (context, incomingMessage) => {
      if (incomingMessage.userSays('lunch') || incomingMessage.userSays('Sure, hit me up!')) {
        context.session = {}
        context.session.hitIndex = 0
        return loadPlaces(context).then(showNextSet)
      }
      else if (incomingMessage.userSays('Show me more')) {
        context.session.hitIndex = context.session.hitIndex+1
        return showNextSet(context)
      }
      else if (incomingMessage.matchJsonPayload(payload => payload.type === 'RESTAURANT_SELECT')) {
        const id = incomingMessage.jsonPayload().id
        const selected = context.session.original.find(restaurant => restaurant.id === id)
        context.session.selected = processor.mapRestaurant(selected, context.location, false)
      }
      else if (incomingMessage.userSays('reset')) {
        context = {}
        context.started = true
      }
      else return null

      return Promise.resolve(context)
    }

    const handleIntro = (context, incomingMessage) => {
      if (incomingMessage.userSays('hi', 'hello', 'get started', 'help', 'Get started', 'lunch')) {
        context = {}
        context.started = true;
      }
      else if (incomingMessage.userSays('Yes please!')) context.greeted = true;
      else if (incomingMessage.userSharesLocation()) context.location = incomingMessage.getUserMessage()
      else return null

      return context
    }

    const loadPlaces = context => {
      return yelpApi.searchRestaurants(context.location.lat, context.location.long)
        .then(results => {
          context.session.results = results
          context.session.original = results.restaurants.map(res => res)
          return context
        })
    }

    if (context.location) return handleLunch(context, incomingMessage)
    else return handleIntro(context, incomingMessage)
  }

}
