import configureApi from './fb-api'

export default configuration => {

  const fbApi = configureApi({access_token: configuration.access_token})

  const messageTo = userId => {
    const message = {
      recipient: {
        id: userId,
      },
      message: {}
    };
    return Promise.resolve(message);
  };

  const addText = text => addToMessage('text', text);
  const addQuickReplies = quickReplies => addToMessage('quick_replies', quickReplies.map(reply => ({
    content_type: 'text',
    title: reply,
    payload: reply
  })));
  const addGenericTemplate = (elements) => addToMessage('attachment', {
    type: 'template',
    payload: {
      template_type: 'generic',
      elements
    }
  });
  const addButtonTemplate = (text, buttons) => addToMessage('attachment', {
    type: 'template',
    payload: {
      template_type: 'button',
      text,
      buttons: buttons.map(button => ({
        payload: button,
        title: button,
        type: 'postback'
      }))
    }
  });
  const addShareLocation = () => addToMessage('quick_replies', [{
    content_type: 'location'
  }]);

  const addImage = url => addToMessage('attachment', {
    type: 'image',
    payload: {
      url
    }
  });

  const addToMessage = (propertyName, content) => {
    return reply => {
      if (reply.message[propertyName] && reply.message[propertyName].constructor == Array) {
        reply.message[propertyName] = [...reply.message[propertyName], ...content];
      } else {
        reply.message[propertyName] = content;
      }

      return reply;
    };
  };

  const sendMessage = fbApi.sendMessage

  return {
    messageTo,
    addText,
    addQuickReplies,
    addGenericTemplate,
    addButtonTemplate,
    addImage,
    addShareLocation,
    sendMessage
  }
}