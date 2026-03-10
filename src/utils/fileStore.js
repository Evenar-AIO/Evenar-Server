const fs = require('fs');
const path = require('path');

const storePath = path.join(__dirname, '..', 'data', 'store.json');

function readStore() {
  const raw = fs.readFileSync(storePath, 'utf8');
  return JSON.parse(raw);
}

function writeStore(data) {
  fs.writeFileSync(storePath, JSON.stringify(data, null, 2));
}

function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

module.exports = {
  readStore,
  writeStore,
  generateId,
};
