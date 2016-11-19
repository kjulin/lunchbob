const contexts = {};
const getContext = (userId) => {
  if (!contexts[userId]) {
    contexts[userId] = {};
  }
  return contexts[userId];
};

const saveContext = (userId, context) => {
  contexts[userId] = context
}

export default {
  getContext,
  saveContext
}