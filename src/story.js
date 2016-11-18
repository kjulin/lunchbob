import {
  message,
  addText,
  addButtonTemplate,
  addGenericTemplate,
  addQuickReplies,
  addShareLocation,
  addImage
} from './fb-message-builder';

import {
  messageIs,
  hasPostback,
  userSays,
  getUserMessage
} from './fb-message-parser'

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

    const recommendPlaces = (context) => {
      return newMessage()
        .then()
        .then(restaurants => {
          return addGenericTemplate(restaurants.map(restaurant => {
            return {
              title: restaurant.name,
              subtitle: restaurant.post_address
            }
          }))
        });
    }

    const userSharesLocation = () => messagingEvent.message && messagingEvent.message.attachments;

    const context = getContextForUser(messagingEvent.sender.id);

    if (userSays('hi', 'hello', 'get started', 'help', 'Get started')) {
      Object.keys(context).forEach(key => delete context[key]);
      context.greeted = true;
    }
    else if (userSays('Let\'s start!', 'Start')) context.started = true;
    else if (userSharesLocation()) context.location = getUserMessage();
    else if (userSays('reset')) resetContextForUser();
    else return unknownCommand();

    if (context.greeted && !context.started) return greet();
    else if (context.started && !context.location) return askLocation()
    else if (context.started && context.location) return recommendPlaces(context)
  };
}