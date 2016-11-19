export default function dispatcher(contextStore, reducer, renderer, parseMessage, log = true) {
  return messagingEvent => {

    const incomingMessage = parseMessage(messagingEvent)

    contextStore.getContext(incomingMessage.userId())
      .then(context => {
        if(log) console.log("Reduce:", context)
        return reducer(context, incomingMessage)
      })
      .then(reduced => {
        if(reduced) return contextStore.saveContext(incomingMessage.userId(), reduced)
        else return reduced
      })
      .then(saved => {
        if(log) console.log("Rendering:", saved)
        renderer(saved, incomingMessage.userId())
      })
      .catch(console.log)
  };
}
