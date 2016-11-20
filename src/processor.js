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
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  var d = Math.round(R * c); // Distance in km
  return d;
}

const degrad = (deg) => {
  return deg * (Math.PI/180)
}

const mapRestaurant = (restaurant, location, allowSelect = true) => {

  const payload = {
    type: 'RESTAURANT_SELECT',
    id: restaurant.id
  }

  const keywords = restaurant.categories.map(category => category[0]).join(", ")
  const rating = Array(Math.floor(restaurant.rating)).fill("\u2B50").join("")
  const distance = restaurant.location.coordinate ? calculateDistance(location, restaurant.location.coordinate) : ""

  const subtitle = `Style: ${keywords}\n\nRating: ${rating}\nDistance: ${distance}m`

  const card = {
    title: restaurant.name,
    subtitle: subtitle,
    image_url: processImageUrl(restaurant.image_url),
    item_url: restaurant.url
  }

  const buttons = []
  const restaurantLocation = restaurant.location.coordinate

  if(restaurantLocation) {

    const url = `http://maps.apple.com?saddr=${location.lat},${location.long}&daddr=${restaurantLocation.latitude}, ${restaurantLocation.longitude}`

    buttons.push({
      type: 'web_url',
      url,
      title: 'Get directions'
    })
  }

  if (allowSelect) {
    buttons.push({
      type: 'postback',
      title: '\uD83D\uDC4D',
      payload: JSON.stringify(payload)
    })
  }

  if(buttons.length > 0) card.buttons = buttons

  return card
}

const processImageUrl = url => {
  if(url) return url.substring(0, url.length - 6) + 'l.jpg'
  else return null
}

const pickRandom = array => {
  const index = parseInt(Math.random() * array.length)
  const picked = array[index]
  array.splice(index, 1)
  return picked
}

export default {
  calculateDistance,
  mapRestaurant,
  pickRandom
}