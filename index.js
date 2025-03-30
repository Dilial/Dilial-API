const getVersions = require('./components/versions');
const getPlayerSkin = require('./components/skins');
const getPlayerHead = require('./components/playerHead');
const accountManager = require('./components/accounts');
const authService = require('./components/auth');

module.exports = {
  getVersions,
  getPlayerSkin,
  getPlayerHead,
  accounts: accountManager,
  auth: authService,
  configureAccountStorage: accountManager.configureStorage
};
