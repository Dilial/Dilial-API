const accountManager = require('./accounts');

/**
 * Updates a player's skin
 * @param {Object} options - Options for updating the skin
 * @param {string} options.skinPath - File path or URL to the skin image
 * @param {boolean} options.slim - Whether to use the slim model (Alex)
 * @param {string} options.uuid - UUID of the account to use, uses active account if not specified
 * @returns {Promise<Object>} Result of the skin update operation
 */
async function updatePlayerSkin(options = {}) {
    try {
        if (!options.skinPath) {
            throw new Error('Skin path is required');
        }

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

        const endpoint = 'https://api.minecraftservices.com/minecraft/profile/skins';
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authData.accessToken}`,
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
 * @returns {Promise<Object>} Result of the cape update operation
 */
async function updatePlayerCape(options = {}) {
    try {
        if (!options.capeId) {
            throw new Error('Cape ID is required');
        }

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

        const endpoint = 'https://api.minecraftservices.com/minecraft/profile/capes/active';
        
        const response = await fetch(endpoint, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authData.accessToken}`,
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
 * @returns {Promise<Object>} Result of the cape deletion operation
 */
async function deletePlayerCape(options = {}) {
    try {
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

        const endpoint = 'https://api.minecraftservices.com/minecraft/profile/capes/active';
        
        const response = await fetch(endpoint, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authData.accessToken}`
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
    deletePlayerCape
}; 