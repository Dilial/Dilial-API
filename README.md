# Dilial API

[![npm version](https://badge.fury.io/js/dilial-api.svg)](https://badge.fury.io/js/dilial-api)

**Dilial API** is a JavaScript API for managing Minecraft accounts and player data. It provides secure account storage with encryption, authentication with both Mojang and Microsoft accounts, and utilities for player skins and version information.

## Installation

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) installed on your machine. If you don't have it, you can download and install it from the official website.

### Installation with npm

To install the API, simply run the following command in your terminal within your Node.js project:

```bash
npm install dilial-api
```

## Features

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

Get player skin data:

```javascript
const { getPlayerSkin, getPlayerHead } = require('dilial-api');

// Get full skin data
const skinData = await getPlayerSkin({ username: 'Notch' });
console.log('Skin URL:', skinData.skinUrl);
console.log('Cape URL:', skinData.capeUrl);
console.log('Is slim model:', skinData.isSlimModel);

// Get just the player head
const headData = await getPlayerHead({ username: 'Notch' });
console.log('2D head:', headData.headImageUrl);
console.log('3D head:', headData.head3dUrl);
```

### Minecraft Versions

Get Minecraft version information:

```javascript
const { getVersions } = require('dilial-api');

// Get all versions
const allVersions = await getVersions();

// Get only release versions
const releaseVersions = await getVersions({ type: 'release' });

// Get only snapshots
const snapshots = await getVersions({ type: 'snapshot' });
```

## Security

The account system uses AES-256-GCM encryption to store authentication data. The encryption key is stored separately with appropriate file permissions. No sensitive data is stored in plain text.

## License

This project is licensed under the MIT License.