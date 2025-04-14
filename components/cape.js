/**
 * Retrieves the cape information for a Minecraft player by username
 * @param {Object} options - Options for getting the player cape
 * @param {string} options.username - Minecraft player username
 * @param {boolean} options.forceRefresh - Force fetching fresh data ignoring cache
 * @returns {Promise<Object>} Cape information including URL and metadata
 */
const getPlayerSkin = require('./skins');

async function getPlayerCape(options = {}) {
    try {
        if (!options.username) {
            throw new Error('Username is required');
        }

        const skinData = await getPlayerSkin(options);
        
        if (skinData.error) {
            return { error: skinData.error };
        }
        
        if (!skinData.capeUrl) {
            return { 
                uuid: skinData.uuid,
                username: skinData.username,
                hasCape: false,
                timestamp: new Date().toISOString(),
                message: "Player does not have a cape"
            };
        }
        
        return {
            uuid: skinData.uuid,
            username: skinData.username,
            hasCape: true,
            capeUrl: skinData.capeUrl,
            capeRenderUrl: skinData.renders.body.cape,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return { error: error.message };
    }
}

module.exports = getPlayerCape;
