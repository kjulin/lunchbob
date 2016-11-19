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

    const showRestaurants = context => {
      return newMessage()
        .then(addText('Sure. Here are three restaurant that you might wanna try'))
        .then(addGenericTemplate(restaurantSetFor(context)))
        .then(sendMessage)
    }

    const restaurantSetFor = context => {
      return context.results.restaurants.slice(0, 3).map(restaurant => {
        return {
          title: restaurant.name,
          subtitle: restaurant.snippet_text,
          image_url: restaurant.image_url,
          site_url: restaurant.url
        }
      })
    }


    const context = getContextForUser(messagingEvent.sender.id);

    if (userSays('hi', 'hello', 'get started', 'help', 'Get started')) {
      Object.keys(context).forEach(key => delete context[key]);
      context.greeted = true;
    }
    else if (userSays('Let\'s start!', 'Start')) context.started = true;
    else if (userSharesLocation()) context.location = getUserMessage();
    else if (userSays('Hit me with random 3')) {
      if(!context.hitIndex) context.hitIndex = 0
      else context.hitIndex = context.hitIndex + 1
    }
    else if (userSays('reset')) resetContextForUser();
    else return unknownCommand();

    console.log('Context', context)

    if (context.greeted && !context.started) return greet();
    else if (context.started && !context.location) return askLocation()
    else if (context.location && !context.results) return loadPlaces(context)
    else if (context.results && context.hitIndex) return showRestaurants(context)
  };
}
