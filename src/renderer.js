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

    const askLocation = () => {
      return newMessage()
        .then(messageBuilder.addText("Let's begin by figuring out your location so I can find lunch places close to you."))
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

      if(context.session.hitIndex == 0) {
        message = message
          .then(messageBuilder.addText(`Awesome! I just found ${context.session.results.total} places that server lunch within 1,0km from your location.`))
          .then(sendMessage)
          .then(newMessage)
      }

      context.session.nextSet.push({
        title: 'Not impressed?',
        subtitle: 'I can give you more recommendations..',
        buttons: [{
          type: 'postback',
          title: 'Show me more',
          payload: 'Show me more'
        }]
      })

      return message
        .then(messageBuilder.addText('Here are three recommendations for you:'))
        .then(sendMessage)
        .then(newMessage)
        .then(messageBuilder.addGenericTemplate(context.session.nextSet))
        .then(sendMessage)
        .catch(console.log)
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

    if (context == null) return unknownCommand()
    else if (context.started && !context.greeted) return greet();
    else if (context.greeted && !context.location) return askLocation()
    else if (context.location && !context.session) return introReady(context)
    else if (context.session && !context.session.selected) return showRestaurants(context)
    else if (context.session && context.session.selected) showRestaurant(context)
  }
}