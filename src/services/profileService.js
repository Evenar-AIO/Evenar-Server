const { readStore, writeStore } = require('../utils/fileStore');

function updateProfile(userId, payload) {
  const store = readStore();
  const userIndex = store.users.findIndex((user) => user.id === userId);

  if (userIndex === -1) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  const updatedUser = {
    ...store.users[userIndex],
    ...payload,
    updatedAt: new Date().toISOString(),
  };

  store.users[userIndex] = updatedUser;
  writeStore(store);
  return updatedUser;
}

function getProfile(userId) {
  const store = readStore();
  const user = store.users.find((item) => item.id === userId);

  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  return user;
}

module.exports = {
  updateProfile,
  getProfile,
};
