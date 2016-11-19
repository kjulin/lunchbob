import crypto from 'crypto'
import OAuth from 'oauth-1.0a'

const API_URL = `https://api.yelp.com/v2/search/`

const oauth = OAuth({
  consumer: {
    key: process.env.YELP_CONSUMER_KEY,
    secret: process.env.YELP_CONSUMER_SECRET
  },
  signature_method: 'HMAC-SHA1',
  hash_function: function (base_string, key) {
    return crypto.createHmac('sha1', key).update(base_string).digest('base64');
  }
});

var token = {
  key: process.env.YELP_TOKEN,
  secret: process.env.YELP_TOKEN_SECRET
};

export const searchRestaurants = (lat, lon) => {


  const request = {
    url: `${API_URL}?category_filter=restaurants&ll=${lat},${lon}&radius_filter=1000&limit=12`,
    method: 'GET'
  }

  const headers = oauth.toHeader(oauth.authorize(request, token))
  headers['Content-Type'] = 'application/json'

  return fetch(request.url, {
    method: 'GET',
    headers
  })
    .then(res => res.json())
    .then(res => {
      return {
        total: res.total,
        restaurants: res.businesses
      }
    })
}
