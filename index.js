import createApp from './src/app';

const configuration = {
  verification_token: process.env.VERIFICATION_TOKEN,
  access_token: process.env.ACCESS_TOKEN
};

const logRequests = true;
const app = createApp(configuration, logRequests);
const port = process.env.PORT || 3000;

app.listen(port, function() {
  console.log('App listening on port ' + port + '!');
});