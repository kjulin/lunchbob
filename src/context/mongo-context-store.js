import {MongoClient} from 'mongodb'

export default configuration => {

  let contexts

  MongoClient.connect(configuration.mongo_url, {poolSize: 10}, (err, db) => {
    if(!err) {
      console.log("Connected to context server")
      contexts = db.collection('context')
    }
    else {
      console.log("Connection to contex server failed!")
      throw new Error(err)
    }
  })

  const getContext = (userId) => {
    return contexts.findOne({userId})
  };

  const saveContext = (userId, context) => {
    context.userId = userId
    return contexts.updateOne({userId}, context, {upsert:true, w: 1}).then(() => context)
  }

  return {
    getContext,
    saveContext
  }
}