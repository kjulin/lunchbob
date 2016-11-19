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

export default function storyRunner(sendMessage, searchRestaurants, getContextForUser = getSession, resetContextForUser = resetSession, getCurrentDate = () => new Date()) {
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
          context.original = results.restaurants.map(res => res)
          return newMessage()
            .then(addText(`Awesome! I just found ${results.total} places that server lunch within 1,0km from your location.`))
            .then(sendMessage)
            .then(newMessage)
            .then(addText(`So far I can only give you some random recommendations.`))
            .then(addQuickReplies(['Just hit me up!']))
            .then(sendMessage)
        })
    }

    const pickRandom = array => {
      const index = parseInt(Math.random() * array.length)
      const picked = array[index]
      array.splice(index, 1)
      return picked
    }

    const restaurantSetFor = context => {

      const selected = Array(3).fill(null).map(_ => pickRandom(context.results.restaurants))

      const items = selected.map(restaurant => mapRestaurant(restaurant, true))
      return items;
    }

    const mapRestaurant = (restaurant, allowSelect = true) => {

      const payload = {
        type: 'RESTAURANT_SELECT',
        id: restaurant.id
      }

      const keywords = restaurant.categories.map(category => category[0]).join(", ")
      const distance = restaurant.location.coordinate ? calculateDistance(context.location, restaurant.location.coordinate) : ""

      const subtitle = `Style: ${keywords}\n\nRating: ${restaurant.rating}\nDistance: ${distance}m`

      const card = {
        title: restaurant.name,
        subtitle: subtitle,
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

    const calculateDistance = (location, restaurantLocation) => {
      return getDistanceFromLatLonInKm(location.lat, location.long, restaurantLocation.latitude, restaurantLocation.longitude)
    }

    const getDistanceFromLatLonInKm = (lat1,lon1,lat2,lon2) => {
      var R = 6371000; // Radius of the earth in km
      var dLat = degrad(lat2-lat1);  // deg2rad below
      var dLon = degrad(lon2-lon1);
      var a =
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(degrad(lat1)) * Math.cos(degrad(lat2)) *
          Math.sin(dLon/2) * Math.sin(dLon/2)
        ;
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      var d = Math.round(R * c); // Distance in km
      return d;
    }

    const degrad = (deg) => {
      return deg * (Math.PI/180)
    }

    const processImageUrl = url => url.substring(0, url.length - 6) + 'l.jpg'

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
          .then(addText('Come on human, I took the liberty to choose!'))
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
        context.selected = pickRandom(context.results.restaurants)
        context.final = true
      }
    }
    else if (matchJsonPayload(payload => payload.type === 'RESTAURANT_SELECT')) {
      const id = jsonPayload().id
      context.selected = context.original.find(restaurant => restaurant.id === id)
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
