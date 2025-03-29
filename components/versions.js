/**
 * Retrieves Minecraft versions from the official API and allows filtering by type.
 * @param {Object} options - Options for getting versions.
 * @param {string} options.type - Version type to filter ('release', 'snapshot').
 * @param {boolean} options.forceRefresh - Force fetching fresh data ignoring cache.
 * @returns {Promise<Array<{ id: string, type: string, releaseTime: string }>>} 
 *          List of versions with ID, type and release date.
 */
async function getVersions(options = {}) {
    try {
        if (options.type && !['release', 'snapshot'].includes(options.type.toLowerCase())) {
            throw new Error('Invalid version type. Must be "release" or "snapshot"');
        }

        const response = await fetch('https://launchermeta.mojang.com/mc/game/version_manifest_v2.json', {
            timeout: 10000,
        });
        
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.versions || !Array.isArray(data.versions)) {
            throw new Error('Invalid response format from Mojang API');
        }
        
        let filteredVersions = data.versions;
        
        if (options.type) {
            const requestedType = options.type.toLowerCase();
            filteredVersions = filteredVersions.filter(version => 
                version.type === requestedType
            );
        }
        
        return filteredVersions.map(({ id, type, releaseTime }) => ({ 
            id, 
            type, 
            releaseTime 
        }));
    } catch (error) {
        console.error("Error fetching versions:", error.message);
        return { error: error.message };
    }
}

module.exports = getVersions;