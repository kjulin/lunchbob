import crypto from 'crypto'
import OAuth from 'oauth-1.0a'
import shuffle from 'shuffle-array'

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

  const mapResult = result => {
    return {
      total: result.total,
      restaurants: result.businesses
    }
  }

  const loadForUrl = url => {
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
      .then(res => {
        if (res.status == 200) return res.json().then(mapResult)
        else return {total: 0, restaurants: []}
      })
      .catch(error => {
        console.log("Yelp fetch failed")
        console.log(error.stack)
      })
  }

  api.searchRestaurants = (lat, lon, cuisine) => {

    const url = (offset = 0) => {
      let url = `${API_URL}?ll=${lat},${lon}&radius_filter=1000&limit=20&offset=${offset}&term=lunch`

      if (cuisine) url = url + `, ${cuisine}`

      return url
    }

    const urls = [url(0), url(20), url(40)]

    return Promise.all(urls.map(loadForUrl))
      .then(results => {
        return results.reduce((combined, next) => {
          return {
            total: combined.total || next.total,
            restaurants: combined.restaurants.concat(next.restaurants)
          }
        }, {total: null, restaurants: []})
      })
      .then(results => {
        results.restaurants = results.restaurants.filter(restaurant => !restaurant.is_closed)
        results.restaurants = shuffle(results.restaurants)
        return results
      })
      .then(shuffledResults => {
        if(shuffledResults.length > 10) return shuffledResults.slice(0, 10)
        else return shuffledResults
      })
  }

  return api
}
