const getVersions = require('./components/versions');
const getPlayerSkin = require('./components/skins');
const getPlayerHead = require('./components/playerHead');
const getPlayerCape = require('./components/cape');
const accountManager = require('./components/accounts');
const authService = require('./components/auth');
const skinUpdater = require('./components/skinUpdater');

module.exports = {
  getVersions,
  getPlayerSkin,
  getPlayerHead,
  getPlayerCape,
  accounts: accountManager,
  auth: authService,
  skinUpdater,
  configureAccountStorage: accountManager.configureStorage
};
