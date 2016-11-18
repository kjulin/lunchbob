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

export default {
  messageIs,
  hasPostback,
  userSays,
  getUserMessage
}