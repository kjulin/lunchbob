import 'isomorphic-fetch';

module.exports = apiConf => {

  const api = {};

  api.sendMessage = (messageObject) => {

    return fetch(`https://graph.facebook.com/v2.6/me/messages?access_token=${apiConf.access_token}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageObject)
      })
      .then(res => res.text.then(console.log))
      .catch(console.log);
  };

  return api;
};