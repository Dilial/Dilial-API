/**
 * Retrieves the skin information for a Minecraft player by username
 * @param {Object} options - Options for getting the player skin
 * @param {string} options.username - Minecraft player username
 * @param {boolean} options.forceRefresh - Force fetching fresh data ignoring cache
 * @returns {Promise<Object>} Skin information including URLs and metadata
 */
async function getPlayerSkin(options = {}) {
    try {
        if (!options.username) {
            throw new Error('Username is required');
        }

        const username = options.username.trim();
        
        if (!username) {
            throw new Error('Username cannot be empty');
        }

        const profileResponse = await fetch(`https://api.mojang.com/users/profiles/minecraft/${username}`, {
            timeout: 10000,
        });
        
        if (!profileResponse.ok) {
            if (profileResponse.status === 404) {
                throw new Error(`Player "${username}" not found`);
            }
            throw new Error(`HTTP Error: ${profileResponse.status}`);
        }
        
        const profile = await profileResponse.json();
        
        if (!profile || !profile.id) {
            throw new Error('Invalid player profile data');
        }
        
        const uuid = profile.id;

        const skinResponse = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`, {
            timeout: 10000,
        });
        
        if (!skinResponse.ok) {
            throw new Error(`HTTP Error: ${skinResponse.status}`);
        }
        
        const skinData = await skinResponse.json();
        
        if (!skinData.properties || !Array.isArray(skinData.properties)) {
            throw new Error('Invalid skin data format');
        }
        
        const texturesProperty = skinData.properties.find(prop => prop.name === 'textures');
        
        if (!texturesProperty) {
            throw new Error('Textures property not found');
        }
        
        const decodedData = JSON.parse(Buffer.from(texturesProperty.value, 'base64').toString('utf-8'));
        const textures = decodedData.textures || {};
        
        return {
            uuid: uuid,
            username: profile.name,
            skinUrl: textures.SKIN?.url || null,
            capeUrl: textures.CAPE?.url || null,
            isSlimModel: textures.SKIN?.metadata?.model === 'slim',
            texturesRaw: texturesProperty.value,
            
            renders: {
                head: {
                    front: `https://mc-heads.net/avatar/${uuid}/64`,
                    full: `https://mc-heads.net/head/${uuid}/64`
                },
                body: {
                    front: `https://mc-heads.net/body/${uuid}/256`,
                    cape: textures.CAPE ? `https://mc-heads.net/cape/${uuid}` : null
                }
            },
            
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error("Error getting player skin:", error.message);
        return { error: error.message };
    }
}

module.exports = getPlayerSkin; 