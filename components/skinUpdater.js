const accountManager = require('./accounts');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// Endpoint constants
const ENDPOINTS = {
    MOJANG: {
        AUTH: 'https://authserver.mojang.com/authenticate',
        SKIN: 'https://api.minecraftservices.com/minecraft/profile/skins',
        CAPE: 'https://api.minecraftservices.com/minecraft/profile/capes/active',
        PROFILE: 'https://api.minecraftservices.com/minecraft/profile'
    },
    MICROSOFT: {
        AUTH: 'https://login.live.com/oauth20_token.srf',
        XBL: 'https://user.auth.xboxlive.com/user/authenticate',
        XSTS: 'https://xsts.auth.xboxlive.com/xsts/authorize',
        MINECRAFT: 'https://api.minecraftservices.com/authentication/login_with_xbox',
        PROFILE: 'https://api.minecraftservices.com/minecraft/profile',
        SKIN: 'https://api.minecraftservices.com/minecraft/profile/skins',
        CAPE: 'https://api.minecraftservices.com/minecraft/profile/capes/active'
    }
};

/**
 * Updates a player's skin
 * @param {Object} options - Options for updating the skin
 * @param {string} options.skinPath - File path or URL to the skin image
 * @param {boolean} options.slim - Whether to use the slim model (Alex)
 * @param {string} options.uuid - UUID of the account to use, uses active account if not specified
 * @param {string} options.accessToken - Direct access token (bypasses internal auth)
 * @param {Object} options.credentials - Direct authentication credentials
 * @param {string} options.credentials.username - Mojang username or email
 * @param {string} options.credentials.password - Mojang password
 * @param {string} options.credentials.type - 'mojang' (only Mojang supported for direct auth)
 * @returns {Promise<Object>} Result of the skin update operation
 */
async function updatePlayerSkin(options = {}) {
    try {
        if (!options.skinPath) {
            throw new Error('Skin path is required');
        }

        // Determine authentication method
        let accessToken;
        let authType;
        
        if (options.accessToken) {
            accessToken = options.accessToken;
            authType = 'direct';
        } else if (options.credentials) {
            const authResult = await directAuthenticate(options.credentials);
            if (!authResult.success) {
                throw new Error(authResult.error || 'Authentication failed');
            }
            accessToken = authResult.accessToken;
            authType = options.credentials.type || 'mojang';
        } else {
            const authData = options.uuid 
                ? accountManager.getAuthData(options.uuid) 
                : accountManager.getAuthData();
            
            if (!authData) {
                throw new Error('No authenticated account found');
            }
            
            const isValid = await validateToken(authData);
            if (!isValid) {
                throw new Error('Authentication token is invalid');
            }
            
            accessToken = authData.accessToken;
            authType = authData.type;
        }

        let skinFile;
        let skinUrl;

        if (options.skinPath.startsWith('http://') || options.skinPath.startsWith('https://')) {
            skinUrl = options.skinPath;
        } else {
            const fs = require('fs');
            if (!fs.existsSync(options.skinPath)) {
                throw new Error('Skin file not found');
            }
            
            skinFile = fs.readFileSync(options.skinPath);
            const base64Skin = skinFile.toString('base64');
            
            skinUrl = `data:image/png;base64,${base64Skin}`;
        }

        const endpoint = ENDPOINTS.MOJANG.SKIN;
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                variant: options.slim ? 'slim' : 'classic',
                url: skinUrl
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(`Failed to update skin: ${errorData.error || response.statusText}`);
        }

        return {
            success: true,
            message: 'Skin updated successfully',
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return { 
            success: false,
            error: error.message 
        };
    }
}

/**
 * Updates a player's cape
 * @param {Object} options - Options for updating the cape
 * @param {string} options.capeId - ID of the cape to equip (e.g., "MineCon2016")
 * @param {string} options.uuid - UUID of the account to use, uses active account if not specified
 * @param {string} options.accessToken - Direct access token (bypasses internal auth)
 * @param {Object} options.credentials - Direct authentication credentials
 * @param {string} options.credentials.username - Mojang username or email
 * @param {string} options.credentials.password - Mojang password
 * @param {string} options.credentials.type - 'mojang' (only Mojang supported for direct auth)
 * @returns {Promise<Object>} Result of the cape update operation
 */
async function updatePlayerCape(options = {}) {
    try {
        if (!options.capeId) {
            throw new Error('Cape ID is required');
        }

        let accessToken;
        
        if (options.accessToken) {
            accessToken = options.accessToken;
        } else if (options.credentials) {
            const authResult = await directAuthenticate(options.credentials);
            if (!authResult.success) {
                throw new Error(authResult.error || 'Authentication failed');
            }
            accessToken = authResult.accessToken;
        } else {
            const authData = options.uuid 
                ? accountManager.getAuthData(options.uuid) 
                : accountManager.getAuthData();
            
            if (!authData) {
                throw new Error('No authenticated account found');
            }
            
            const isValid = await validateToken(authData);
            if (!isValid) {
                throw new Error('Authentication token is invalid');
            }
            
            accessToken = authData.accessToken;
        }

        const endpoint = ENDPOINTS.MOJANG.CAPE;
        
        const response = await fetch(endpoint, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                capeId: options.capeId
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(`Failed to update cape: ${errorData.error || response.statusText}`);
        }

        return {
            success: true,
            message: 'Cape updated successfully',
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return { 
            success: false,
            error: error.message 
        };
    }
}

/**
 * Deletes a player's cape (removes current cape)
 * @param {Object} options - Options for deleting the cape
 * @param {string} options.uuid - UUID of the account to use, uses active account if not specified
 * @param {string} options.accessToken - Direct access token (bypasses internal auth)
 * @param {Object} options.credentials - Direct authentication credentials
 * @param {string} options.credentials.username - Mojang username or email
 * @param {string} options.credentials.password - Mojang password
 * @param {string} options.credentials.type - 'mojang' (only Mojang supported for direct auth)
 * @returns {Promise<Object>} Result of the cape deletion operation
 */
async function deletePlayerCape(options = {}) {
    try {
        let accessToken;
        
        if (options.accessToken) {
            accessToken = options.accessToken;
        } else if (options.credentials) {
            const authResult = await directAuthenticate(options.credentials);
            if (!authResult.success) {
                throw new Error(authResult.error || 'Authentication failed');
            }
            accessToken = authResult.accessToken;
        } else {
            const authData = options.uuid 
                ? accountManager.getAuthData(options.uuid) 
                : accountManager.getAuthData();
            
            if (!authData) {
                throw new Error('No authenticated account found');
            }
            
            const isValid = await validateToken(authData);
            if (!isValid) {
                throw new Error('Authentication token is invalid');
            }
            
            accessToken = authData.accessToken;
        }

        const endpoint = ENDPOINTS.MOJANG.CAPE;
        
        const response = await fetch(endpoint, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(`Failed to delete cape: ${errorData.error || response.statusText}`);
        }

        return {
            success: true,
            message: 'Cape removed successfully',
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return { 
            success: false,
            error: error.message 
        };
    }
}

/**
 * Get available capes for the authenticated user
 * @param {Object} options - Options for getting capes
 * @param {string} options.uuid - UUID of the account to use, uses active account if not specified
 * @param {string} options.accessToken - Direct access token (bypasses internal auth)
 * @param {Object} options.credentials - Direct authentication credentials
 * @returns {Promise<Object>} List of available capes for the user
 */
async function getAvailableCapes(options = {}) {
    try {
        let accessToken;
        
        if (options.accessToken) {
            accessToken = options.accessToken;
        } else if (options.credentials) {
            const authResult = await directAuthenticate(options.credentials);
            if (!authResult.success) {
                throw new Error(authResult.error || 'Authentication failed');
            }
            accessToken = authResult.accessToken;
        } else {
            const authData = options.uuid 
                ? accountManager.getAuthData(options.uuid) 
                : accountManager.getAuthData();
            
            if (!authData) {
                throw new Error('No authenticated account found');
            }
            
            const isValid = await validateToken(authData);
            if (!isValid) {
                throw new Error('Authentication token is invalid');
            }
            
            accessToken = authData.accessToken;
        }
        
        const endpoint = 'https://api.minecraftservices.com/minecraft/profile/capes';
        
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(`Failed to get capes: ${errorData.error || response.statusText}`);
        }
        
        const capeData = await response.json();
        
        return {
            success: true,
            capes: capeData.capes || [],
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            capes: []
        };
    }
}

/**
 * Authenticate directly with Mojang without storing credentials
 * @param {Object} credentials - Authentication credentials
 * @param {string} credentials.username - Mojang username/email
 * @param {string} credentials.password - Mojang password
 * @param {string} credentials.type - Auth type ('mojang' only supported for direct)
 * @returns {Promise<Object>} Authentication result with tokens
 */
async function directAuthenticate(credentials) {
    try {
        if (!credentials.username || !credentials.password) {
            return {
                success: false,
                error: 'Username and password are required'
            };
        }
        
        if (credentials.type && credentials.type !== 'mojang') {
            return {
                success: false,
                error: 'Only Mojang authentication is supported for direct mode'
            };
        }
        
        const clientToken = crypto.randomBytes(16).toString('hex');
        
        const response = await fetch(ENDPOINTS.MOJANG.AUTH, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                agent: {
                    name: 'Minecraft',
                    version: 1
                },
                username: credentials.username,
                password: credentials.password,
                clientToken
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                error: errorData.errorMessage || `Error ${response.status}: ${response.statusText}`
            };
        }
        
        const data = await response.json();
        
        if (!data.accessToken) {
            return {
                success: false,
                error: 'Invalid authentication response'
            };
        }
        
        return {
            success: true,
            accessToken: data.accessToken,
            clientToken: data.clientToken,
            uuid: data.selectedProfile.id,
            username: data.selectedProfile.name
        };
    } catch (error) {
        return {
            success: false,
            error: `Authentication failed: ${error.message}`
        };
    }
}

async function validateToken(authData) {
    try {
        if (authData.type === 'microsoft' && authData.expiresAt && authData.expiresAt > Date.now()) {
            return true;
        }
        
        const endpoint = authData.type === 'mojang' 
            ? 'https://authserver.mojang.com/validate'
            : 'https://api.minecraftservices.com/minecraft/profile';
            
        const options = {
            method: authData.type === 'mojang' ? 'POST' : 'GET',
            headers: {
                'Authorization': `Bearer ${authData.accessToken}`
            }
        };
        
        if (authData.type === 'mojang') {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify({
                accessToken: authData.accessToken,
                clientToken: authData.clientToken
            });
        }
        
        const response = await fetch(endpoint, options);
        return response.status === (authData.type === 'mojang' ? 204 : 200);
    } catch (error) {
        return false;
    }
}

module.exports = {
    updatePlayerSkin,
    updatePlayerCape,
    deletePlayerCape,
    getAvailableCapes,
    directAuthenticate
}; 