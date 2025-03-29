const getPlayerSkin = require('./skins');

async function getPlayerHead(options = {}) {
    try {
        if (!options.username) {
            throw new Error('Username is required');
        }

        const skinData = await getPlayerSkin(options);
        
        if (skinData.error) {
            return { error: skinData.error };
        }
        
        return {
            uuid: skinData.uuid,
            username: skinData.username,
            headImageUrl: skinData.renders.head.front,
            head3dUrl: skinData.renders.head.full,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return { error: error.message };
    }
}

module.exports = getPlayerHead; 