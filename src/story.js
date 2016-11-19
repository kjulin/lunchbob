import {
  message,
  addText,
  addButtonTemplate,
  addGenericTemplate,
  addQuickReplies,
  addShareLocation,
  addImage
} from './fb-message-builder';

import {getVenues} from './smartum-api'
import {searchRestaurants} from './yelp-api'

const sessions = {};
const getSession = (userId) => {
  if (!sessions[userId]) {
    sessions[userId] = {};
  }
  return sessions[userId];
};

const resetSession = (userId) => {
  sessions[userId] = {};
};

export default function storyRunner(sendMessage, getContextForUser = getSession, resetContextForUser = resetSession, getCurrentDate = () => new Date()) {
  return function runStory(messagingEvent) {

    const messageIs = text => {
      if (messagingEvent.message && messagingEvent.message.text) {
        return messagingEvent.message.text.toLowerCase() === text.toLowerCase();
      }
    };

    const hasPostback = payload => {
      return messagingEvent.postback && messagingEvent.postback.payload === payload;
    };

    const jsonPayload = () => {
      try {
        const payload = JSON.parse(messagingEvent.postback.payload)
        return payload
      } catch (err) {
        return {}
      }
    }

    const matchJsonPayload = matcher => {
      return matcher(jsonPayload())
    }

    const userSays = (...keywords) => keywords.some(word => messageIs(word) || hasPostback(word));

    const getUserMessage = () => {
      if (messagingEvent.message && messagingEvent.message.text) {
        return messagingEvent.message.text.toLowerCase();
      }

      if (messagingEvent.postback) {
        return messagingEvent.postback.payload.toLowerCase();
      }

      if (messagingEvent.message && messagingEvent.message.attachments) {
        const locationAttachment = messagingEvent.message.attachments[0];
        return locationAttachment.payload.coordinates;
      }
    };

    const userSharesLocation = () => messagingEvent.message && messagingEvent.message.attachments;

    const newMessage = () => {
      return message(messagingEvent.sender.id);
    };

    const greet = () => {
      return newMessage()
        .then(addText("Hey human! It's me, LunchBob! My job is to help you take the weight off your shoulders when deciding the place to have lunch each day. Can I be of your assistance?"))
        .then(addQuickReplies(['Yes please!']))
        .then(sendMessage);
    };

    const unknownCommand = () => {
      return newMessage()
        .then(addText('Dunno'))
        .then(sendMessage);
    };

    const askLocation = () => {
      return newMessage()
        .then(addText("Let's begin by figuring out your location so I can find lunch places close to you."))
        .then(addShareLocation())
        .then(sendMessage)
    };

    const loadPlaces = (context) => {

      return searchRestaurants(context.location.lat, context.location.long)
        .then(results => {
          context.results = results
          return newMessage()
            .then(addText(`Awesome! I just found ${results.total} places that server lunch within 1,0km from your location.`))
            .then(sendMessage)
            .then(newMessage)
            .then(addText(`So far I can only give you some random recommendations.`))
            .then(addQuickReplies(['Just hit me up!']))
            .then(sendMessage)
        })
    }

    const restaurantSetFor = context => {

      const restaurants = context.results.restaurants
      let start = context.hitIndex * 3
      let end = start + 3

      if (end >= restaurants.length) {
        start = restaurants.length - 3
        end = restaurants.length
      }

      const items = context.results.restaurants.slice(start, end).map(restaurant => mapRestaurant(restaurant, true))
      return items;
    }

    const mapRestaurant = (restaurant, allowSelect = true) => {

      const payload = {
        type: 'RESTAURANT_SELECT',
        id: restaurant.id
      }

      const card = {
        title: restaurant.name,
        image_url: processImageUrl(restaurant.image_url),
        item_url: restaurant.url
      }

      if (allowSelect) {
        card.buttons = [{
          type: 'postback',
          title: '\uD83D\uDC4D',
          payload: JSON.stringify(payload)
        }]
      }

      return card
    }

    const processImageUrl = url => {
      return url.substring(0, url.length - 3) + 'l.png'
    }

    const showRestaurants = context => {

      const restaurantSet = restaurantSetFor(context)

      return newMessage()
        .then(addText('Sure. Here are three recommendations for you:'))
        .then(sendMessage)
        .then(newMessage)
        .then(addGenericTemplate(restaurantSet))
        .then(addQuickReplies(['Nope, hit 3 more!']))
        .then(sendMessage)
        .catch(console.log)
    }

    const showRestaurant = (context) => {

      const restaurant = mapRestaurant(context.selected, false)
      const message = newMessage()

      if (context.final) {
        message
          .then(addText('Come on dude, I took the liberty to choose!'))
      }
      else {
        message
          .then(addText('Awesome! Hope you enjoy!'))
      }

      message.then(sendMessage).then(newMessage)

      return message
        .then(addText('Protip: You can invite friends using the share button next to the card.'))
        .then(sendMessage)
        .then(newMessage)
        .then(addGenericTemplate([restaurant]))
        .then(sendMessage)
        .catch(console.log)
    }

    const context = getContextForUser(messagingEvent.sender.id);

    if (userSays('hi', 'hello', 'get started', 'help', 'Get started')) {
      Object.keys(context).forEach(key => delete context[key]);
      context.started = true;
    }
    else if (userSays('Yes please!')) context.greeted = true;
    else if (userSharesLocation()) context.location = getUserMessage();
    else if (userSays('Just hit me up!')) context.hitIndex = 0
    else if (userSays('Nope, hit 3 more!')) {
      if (context.hitIndex < 2) context.hitIndex = context.hitIndex + 1
      else {
        context.selected = context.results.restaurants[context.results.restaurants.length - 1]
        context.final = true
      }
    }
    else if (matchJsonPayload(payload => payload.type === 'RESTAURANT_SELECT')) {
      const id = jsonPayload().id
      context.selected = context.results.restaurants.find(restaurant => restaurant.id === id)
    }
    else if (userSays('reset')) resetContextForUser();
    else return unknownCommand();

    console.log('Context', context)

    if (context.started && !context.greeted) return greet();
    else if (context.greeted && !context.location) return askLocation()
    else if (context.location && !context.results) return loadPlaces(context)
    else if (context.results && context.hitIndex != null && !context.selected) return showRestaurants(context)
    else if (context.selected) showRestaurant(context)
  };
}
