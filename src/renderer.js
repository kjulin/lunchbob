export default (messageBuilder) => {

  return (context, userId) => {

    const newMessage = () => messageBuilder.messageTo(userId)
    const sendMessage = messageBuilder.sendMessage

    const greet = () => {
      return newMessage()
        .then(messageBuilder.addGenericTemplate([{
          title: 'Hi human! My name is Bob the hungry pug. People also call me LunchBob.',
          image_url: 'https://s3-eu-west-1.amazonaws.com/lunchbob/hello.png'
        }]))
        .then(sendMessage)
        .then(newMessage)
        .then(messageBuilder.addText('My job is to help you take the weight off your shoulders when deciding the place to have lunch each day. Let\'s begin, shall we?'))
        .then(messageBuilder.addQuickReplies(['Yes please!']))
        .then(sendMessage)
    };

    const unknownCommand = () => {
      return newMessage()
        .then(messageBuilder.addText("Just say 'lunch' and I'll look for some restaurant for you!"))
        .then(sendMessage);
    };

    const askLocation = (change = false) => {

      let message = newMessage()

      if (!change) message = message.then(messageBuilder.addText("Let's begin by figuring out your location so I can find lunch places close to you."))
      else message = message.then(messageBuilder.addText("OK, just share your new location.\nProtip: your can move pin on the map to select other than current location."))

      return message
        .then(messageBuilder.addShareLocation())
        .then(sendMessage)
    };

    const introReady = () => {
      return newMessage()
        .then(messageBuilder.addText("Awesome! I will use this as your home location. You can change it any time from menu. Now, let's have some lunch, shall we?"))
        .then(messageBuilder.addQuickReplies(['Sure, hit me up!']))
        .then(sendMessage)
    }

    const showRestaurants = context => {

      let message = newMessage()

      const type = context.session.cuisine || 'lunch'
      const count = context.session.nextSet.length

      if (context.session.hitIndex == 0 && count > 0) {
        message = message
          .then(messageBuilder.addText(`Awesome! I just found ${context.session.results.total} places that serve ${type} within 1,0km from your location.`))
          .then(sendMessage)
          .then(newMessage)
      }
      else if(context.session.hitIndex == 0 && count == 0) {
        message = message
          .then(messageBuilder.addText(`Damn, there seems to be no restaurants near you that would serve ${type}.`))
          .then(messageBuilder.addQuickReplies(['Start over', 'Select cuisine']))
          .then(sendMessage)
          .then(newMessage)
      }
      else if(count == 0) {
        message = message
          .then(messageBuilder.addText(`Unfortunately I have no more recommendations for you. Maybe you should try again?`))
          .then(messageBuilder.addQuickReplies(['Try again', 'Select cuisine']))
          .then(sendMessage)
          .then(newMessage)
      }

      if(count > 0) {

        context.session.nextSet.push({
          title: 'Not impressed?',
          subtitle: 'I can give you more recommendations..',
          buttons: [{
            type: 'postback',
            title: 'Show me more',
            payload: 'show me more'
          },
            {
              type: 'postback',
              title: 'Select cuisine',
              payload: 'select cuisine'
            }]
        })

        message = message
          .then(messageBuilder.addText(`Here are some recommendations to eat ${type}:`))
          .then(sendMessage)
          .then(newMessage)
          .then(messageBuilder.addGenericTemplate(context.session.nextSet))
          .then(sendMessage)
          .catch(console.log)

        if(count < 3) {
          message = message
            .then(newMessage)
            .then(messageBuilder.addText('These are the last recommendations I have.'))
        }
      }
      else return message
    }

    const showRestaurant = (context) => {

      const message = newMessage()

      if (context.session.final) message.then(messageBuilder.addText('Come on human, I took the liberty to choose!'))
      else message.then(messageBuilder.addText('Awesome! Hope you enjoy!'))

      message.then(sendMessage).then(newMessage)

      return message
        .then(messageBuilder.addText('Protip: You can invite friends using the share button next to the card.'))
        .then(sendMessage)
        .then(newMessage)
        .then(messageBuilder.addGenericTemplate([context.session.selected]))
        .then(sendMessage)
        .then(newMessage)
        .then(messageBuilder.addText("You can consult me again any time just by saying 'lunch'"))
        .then(sendMessage)
        .catch(console.log)
    }

    const selectCuisine = () => {

      return newMessage()
        .then(messageBuilder.addText('Right, so you want some specific cuisine. How about one of these?'))
        .then(sendMessage)
        .then(newMessage)
        .then(messageBuilder.addGenericTemplate([
          {
            title: 'Buffet',
            subtitle: 'I\'m so hungry I could eat a water buffalo.',
            image_url: 'https://s3-eu-west-1.amazonaws.com/lunchbob/buffet.png',
            buttons: [{
              type: 'postback',
              title: 'This is it!',
              payload: 'buffets'
            }]
          },
          {
            title: 'Burgers',
            subtitle: 'Nothing beats a good burger.',
            image_url: 'https://s3-eu-west-1.amazonaws.com/lunchbob/burgers.png',
            buttons: [{
              type: 'postback',
              title: 'This is it!',
              payload: 'burgers'
            }]
          },
          {
            title: 'Salad',
            subtitle: 'Today I eat healthy.',
            image_url: 'https://s3-eu-west-1.amazonaws.com/lunchbob/salads.png',
            buttons: [{
              type: 'postback',
              title: 'This is it!',
              payload: 'salad'
            }]
          },
          {
            title: 'Sushi',
            subtitle: 'Some grilled salmon nigiris, please.',
            image_url: 'https://s3-eu-west-1.amazonaws.com/lunchbob/sushi.png',
            buttons: [{
              type: 'postback',
              title: 'This is it!',
              payload: 'sushi'
            }]
          },
          {
            title: 'Still not impressed?',
            subtitle: 'Damn, how difficult it is to decide a lunch place?',
            buttons: [{
              type: 'postback',
              title: 'I prefer random',
              payload: 'show me more'
            }]
          }
        ]))
        .then(sendMessage)
    }

    if (context == null) return unknownCommand()
    else if (context.started && !context.greeted) return greet();
    else if (context.greeted && !context.location) return askLocation(context.changeLocation)
    else if (context.location && !context.session) return introReady(context)
    else if (context.session && context.session.cuisine === 'select') return selectCuisine()
    else if (context.session && !context.session.selected) return showRestaurants(context)
    else if (context.session && context.session.selected) showRestaurant(context)
  }
}