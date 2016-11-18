import shuffle from 'shuffle-array'

const API_URL = `https://api.smartum.fi/v1/`

export const getVenues = (lat, lon) => {
  console.log(lat)
  console.log(lon)
  return fetch(`${API_URL}venues?near=${lat},${lon}&service_type=lunch&limit=100`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  })
    .then(res => res.json())
    .then(res => res.data)
    .then(res => shuffle.pick(res, {picks: 3}))
}
