require('dotenv').config({silent: true})
import createApp from './src/app';

const configuration = {
  verification_token: process.env.VERIFICATION_TOKEN,
  access_token: process.env.ACCESS_TOKEN,
  yelp_consumer_key: process.env.YELP_CONSUMER_KEY,
  yelp_consumer_secret: process.env.YELP_CONSUMER_SECRET,
  yelp_token: process.env.YELP_TOKEN,
  yelp_token_secret: process.env.YELP_TOKEN_SECRET,
  mongo_url: process.env.MONGO_URL
};

const logRequests = true;
const app = createApp(configuration, logRequests);
const port = process.env.PORT || 3000;

app.listen(port, function() {
  console.log('App listening on port ' + port + '!');
});