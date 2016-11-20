import crypto from 'crypto'
import OAuth from 'oauth-1.0a'

const API_URL = `https://api.yelp.com/v2/search/`

module.exports = configuration => {

  const oauth = OAuth({
    consumer: {
      key: configuration.yelp_consumer_key,
      secret: configuration.yelp_consumer_secret
    },
    signature_method: 'HMAC-SHA1',
    hash_function: function (base_string, key) {
      return crypto.createHmac('sha1', key).update(base_string).digest('base64')
    }
  })

  const token = {
    key: configuration.yelp_token,
    secret: configuration.yelp_token_secret
  }

  const api = {}

  api.searchRestaurants = (lat, lon, cuisine) => {

    let url = `${API_URL}?ll=${lat},${lon}&radius_filter=1000&limit=20&term=lunch`

    if(cuisine) url = url + `, ${cuisine}`

    const request = {
      url,
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
      .then(res => {
        console.log(res)
        return res
      })
      .catch(error => {
        console.log("Yelp fetch failed")
        console.log(error.stack)
      })
  }

  return api
}
