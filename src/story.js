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
        .then(addText('Hi there!'))
        .then(addQuickReplies(['Let\'s start!']))
        .then(sendMessage);
    };

    const unknownCommand = () => {
      return newMessage()
        .then(addText('Dunno'))
        .then(sendMessage);
    };

    const askLocation = () => {
      return newMessage()
        .then(addText('What is your location'))
        .then(sendMessage)
        .then(newMessage)
        .then(addGenericTemplate([{
          title: 'Share location',
          subtitle: 'Pro tip: You can also write the starting point if it\'s not your current location'
        }]))
        .then(addShareLocation())
        .then(sendMessage);
    };

    const loadPlaces = (context) => {

      return searchRestaurants(context.location.lat, context.location.long)
        .then(results => {
          context.results = results
          return newMessage()
            .then(addText(`I found ${results.total} places in 1km distance from you. How would you like to proceed?`))
            .then(addQuickReplies(['Hit me with random 3']))
            .then(sendMessage)
        })
    }

    const restaurantSetFor = context => {

      const restaurants = context.results.restaurants
      let start = context.hitIndex * 3
      let end = start + 3

      if(end >= restaurants.length) {
        start = restaurants.length - 3
        end = restaurants.length
      }

      const items = context.results.restaurants.slice(start, end).map(mapRestaurant)
      return items;
    }

    const mapRestaurant = restaurant => {
      return {
        title: restaurant.name,
        image_url: restaurant.image_url,
        item_url: restaurant.url
      }
    }

    const showRestaurants = context => {

      const restaurantSet = restaurantSetFor(context)

      return newMessage()
        .then(addText('Sure. Here are three restaurants that you might wanna try'))
        .then(sendMessage)
        .then(newMessage)
        .then(addGenericTemplate(restaurantSet))
        .then(addQuickReplies(['Nope, hit 3 more']))
        .then(sendMessage)
        .catch(console.log)
    }

    const showFinalChoice = (context) => {

      const restaurant = context.results.restaurants[context.results.restaurants.length -1]

      return newMessage()
        .then(addText('Come on dude, time to eat! Here is your place:'))
        .then(addGenericTemplate([mapRestaurant(restaurant)]))
    }

    const context = getContextForUser(messagingEvent.sender.id);

    if (userSays('hi', 'hello', 'get started', 'help', 'Get started')) {
      Object.keys(context).forEach(key => delete context[key]);
      context.greeted = true;
    }
    else if (userSays('Let\'s start!', 'Start')) context.started = true;
    else if (userSharesLocation()) context.location = getUserMessage();
    else if (userSays('Hit me with random 3')) context.hitIndex = 0
    else if (userSays('Nope, hit 3 more')) {
      if(context.hitIndex < 3) context.hitIndex = context.hitIndex+1
      else context.final = true
    }
    else if (userSays('reset')) resetContextForUser();
    else return unknownCommand();

    console.log('Context', context)

    if (context.greeted && !context.started) return greet();
    else if (context.started && !context.location) return askLocation()
    else if (context.location && !context.results) return loadPlaces(context)
    else if (context.results && context.hitIndex != null && !context.final) return showRestaurants(context)
    else if (context.final) return showFinalChoice(context)
  };
}
