# Dilial API

[![npm version](https://badge.fury.io/js/dilial-api.svg)](https://badge.fury.io/js/dilial-api)

**Dilial API** is a JavaScript API for managing Minecraft accounts and player data. It provides secure account storage with AES-256-GCM encryption, authentication with both Mojang and Microsoft accounts, and utilities for player skins and version information.

## Installation

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) installed on your machine. If you don't have it, you can download and install it from the official website.

### Installation with npm

To install the API, simply run the following command in your terminal within your Node.js project:

```bash
npm install dilial-api
```

## Features

### Configurable Account Storage

You can configure where and how accounts are stored:

```javascript
const { configureAccountStorage } = require('dilial-api');

// Use file system (default)
configureAccountStorage({
  type: 'file',
  location: '/custom/path/to/store/accounts'
});

// Use Electron.js store
const Store = require('electron-store');
const electronStore = new Store();

configureAccountStorage({
  type: 'electron',
  electronStore: electronStore
});

// Use memory only (no persistence)
configureAccountStorage({
  type: 'memory'
});

// Use custom storage implementation
configureAccountStorage({
  type: 'custom',
  customHandler: {
    read: () => myCustomReadFunction(),
    write: (data) => myCustomWriteFunction(data),
    readKey: () => myCustomReadKeyFunction(),
    writeKey: (key) => myCustomWriteKeyFunction(key)
  }
});
```

### Authentication

The API supports both Mojang and Microsoft authentication methods:

```javascript
const { auth } = require('dilial-api');

// Mojang authentication
const mojangAuth = await auth.mojangAuthenticate('username', 'password');

// Microsoft authentication (OAuth flow)
const authUrl = await auth.microsoftGenerateAuthUrl('https://your-redirect-uri.com');
console.log('Open this URL to login:', authUrl.url);

// Once you get the code from the redirect:
const msAuth = await auth.microsoftAuthenticateWithCode('authorization_code', 'https://your-redirect-uri.com');
```

### Account Management

The API stores accounts securely with encryption and supports multiple accounts:

```javascript
const { accounts } = require('dilial-api');

// Get all saved accounts (safe data only)
const allAccounts = accounts.getAccounts();

// Get the currently active account
const active = accounts.getActiveAccount();

// Set a different account as active
accounts.setActiveAccount('uuid-of-account');

// Get full authentication data (with tokens)
const authData = accounts.getAuthData();

// Remove an account
accounts.removeAccount('uuid-of-account');
```

### Player Skins

Get player skin data with efficient caching:

```javascript
const { getPlayerSkin, getPlayerHead } = require('dilial-api');

// Get full skin data
const skinData = await getPlayerSkin({ username: 'Notch' });
console.log('Skin URL:', skinData.skinUrl);
console.log('Cape URL:', skinData.capeUrl);
console.log('Is slim model:', skinData.isSlimModel);

// Force refresh cached data
const freshData = await getPlayerSkin({ 
  username: 'Notch',
  forceRefresh: true 
});

// Get just the player head
const headData = await getPlayerHead({ username: 'Notch' });
console.log('2D head:', headData.headImageUrl);
console.log('3D head:', headData.head3dUrl);
```

### Player Capes

Get a player's cape data:

```javascript
const { getPlayerCape } = require('dilial-api');

// Get player's cape information
const capeData = await getPlayerCape({ username: 'Notch' });

if (capeData.hasCape) {
  console.log('Cape URL:', capeData.capeUrl);
  console.log('Cape Render URL:', capeData.capeRenderUrl);
} else {
  console.log(capeData.message); // "Player does not have a cape"
}
```

### Update Skin and Cape

You can update the skin and cape for authenticated players:

```javascript
const { skinUpdater } = require('dilial-api');

// Update player skin from file (supports both classic and slim models)
const skinResult = await skinUpdater.updatePlayerSkin({
  skinPath: './path/to/skin.png',
  slim: true // Use slim model (Alex), false for classic (Steve)
});

// Update player skin from URL
const skinUrlResult = await skinUpdater.updatePlayerSkin({
  skinPath: 'https://example.com/skin.png'
});

// Update player cape (using cape ID)
const capeResult = await skinUpdater.updatePlayerCape({
  capeId: 'MineCon2016'
});

// Remove a player's cape
const capeDeleteResult = await skinUpdater.deletePlayerCape();

// Use with a specific account (not the active one)
const specificAccountResult = await skinUpdater.updatePlayerSkin({
  skinPath: './custom_skin.png',
  uuid: 'player-uuid-here'
});
```

#### Direct Authentication Mode

You can also update skins and capes without using the API's internal authentication system by providing direct credentials or an access token:

```javascript
const { skinUpdater } = require('dilial-api');

// Authenticate directly with Mojang credentials (without storing in the account system)
const authResult = await skinUpdater.directAuthenticate({
  username: 'your_email@example.com',
  password: 'your_password'
});

if (authResult.success) {
  console.log('Authentication successful!');
  console.log('Access Token:', authResult.accessToken);
  
  // Use the access token directly
  const skinResult = await skinUpdater.updatePlayerSkin({
    skinPath: './path/to/skin.png',
    accessToken: authResult.accessToken
  });
}

// Provide credentials directly in one step
const skinResult = await skinUpdater.updatePlayerSkin({
  skinPath: './path/to/skin.png',
  credentials: {
    username: 'your_email@example.com',
    password: 'your_password'
  }
});

// Update a cape with direct credentials
const capeResult = await skinUpdater.updatePlayerCape({
  capeId: 'MineCon2016',
  credentials: {
    username: 'your_email@example.com',
    password: 'your_password'
  }
});

// Get available capes for the authenticated user
const availableCapes = await skinUpdater.getAvailableCapes({
  accessToken: 'your_access_token'  // Or provide credentials object
});

if (availableCapes.success) {
  console.log('Available capes:', availableCapes.capes);
}
```

### Minecraft Versions

Get Minecraft version information with built-in caching:

```javascript
const { getVersions } = require('dilial-api');

// Get all versions
const allVersions = await getVersions();

// Get only release versions
const releaseVersions = await getVersions({ type: 'release' });

// Get only snapshots
const snapshots = await getVersions({ type: 'snapshot' });

// Force fresh data
const freshVersions = await getVersions({ forceRefresh: true });
```

## Security

The account system uses AES-256-GCM encryption with the following security features:

- Encryption keys are securely generated and stored
- Tokens and sensitive data are never exposed in plain text
- When using file storage, proper file permissions are set (0600)
- Custom storage options allow for advanced security implementations

## Performance

- Fast API responses with intelligent caching
- Adjustable cache duration for version lists and skin data
- Timeout protection for all network requests
- Memory-efficient storage of frequently used data

## License

This project is licensed under the MIT License.