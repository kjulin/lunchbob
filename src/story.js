import {
  message,
  addText,
  addButtonTemplate,
  addGenericTemplate,
  addQuickReplies,
  addShareLocation,
  addImage
} from './fb-message-builder';

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

      if(messagingEvent.message && messagingEvent.message.attachments) {
        const locationAttachment = messagingEvent.message.attachments[0];
        return locationAttachment.payload.coordinates;
      }
    };

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


    const askStartLocation = () => {
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

    const locationElement = (location) => {
      const postbackPayload = {
        type: 'location',
        location: {
          lat: location.lat,
          long: location.lon
        }
      };
      const image_url = `https://maps.googleapis.com/maps/api/staticmap?size=764x400&center=${location.lat},${location.lon}&zoom=15&markers=${location.lat},${location.lon}`;
      return {
        title: location.formattedAddress,
        subtitle: 'Your location',
        image_url,
        item_url: `http://maps.apple.com/maps?q=${location.lat},${location.lon}&z=15`,
        buttons: [{
          title: 'Use this',
          type: 'postback',
          payload: JSON.stringify(postbackPayload)
        }]
      };
    };

    const resolveLocation = (typedAddress) => {
      return locationFromAddress(typedAddress)
          .then(response => {
          if (response.success) {
        const locationElements = response.locations.map(locationElement);
        return newMessage()
          .then(addGenericTemplate(locationElements))
          .then(sendMessage);
      } else {
        return newMessage()
          .then(addText('I could not find any location that matches the given address. Please try again or share your location.'))
          .then(addShareLocation())
          .then(sendMessage);
      }
    });
    };


    const userSharesLocation = () => messagingEvent.message && messagingEvent.message.attachments;


    const userSelectsLocation = () => {
      if (!messagingEvent.postback) return false;
      const payload = JSON.parse(messagingEvent.postback.payload);
      return payload && payload.type == 'location';
    };

    const getSelectedLocation = () => {
      const payload = JSON.parse(messagingEvent.postback.payload);
      return payload.location;
    };

    const context = getContextForUser(messagingEvent.sender.id);

    if (userSays('hi', 'hello', 'get started', 'help', 'Get started')) {
      Object.keys(context).forEach(key => delete context[key]);
      context.greeted = true;
    }
    else if (userSays('Let\'s start!', 'Start')) context.started = true;
    else if (userSharesLocation()) context.startLocation = getUserMessage();
    else if (userSays('reset')) resetContextForUser();
    else if (context.resolveLocationFor && userSelectsLocation()) context.startLocation = getSelectedLocation();
    else return unknownCommand();

    if(context.greeted && !context.started) return greet();
    else return askStartLocation()
  };
}