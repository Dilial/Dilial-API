/**
 * Retrieves Minecraft versions from the official API and allows filtering by type.
 * @param {Object} options - Options for getting versions.
 * @param {string} options.type - Version type to filter ('release', 'snapshot').
 * @param {boolean} options.forceRefresh - Force fetching fresh data ignoring cache.
 * @returns {Promise<Array<{ id: string, type: string, releaseTime: string }>>} 
 *          List of versions with ID, type and release date.
 */
let cachedVersions = null;
let lastFetchTime = null;
const CACHE_DURATION = 60 * 60 * 1000;

async function getVersions(options = {}) {
    try {
        if (options.type && !['release', 'snapshot'].includes(options.type.toLowerCase())) {
            throw new Error('Invalid version type. Must be "release" or "snapshot"');
        }
        
        const now = Date.now();
        const useCache = !options.forceRefresh && cachedVersions && lastFetchTime && (now - lastFetchTime < CACHE_DURATION);
        
        if (!useCache) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            try {
                const response = await fetch('https://launchermeta.mojang.com/mc/game/version_manifest_v2.json', {
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP Error: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (!data.versions || !Array.isArray(data.versions)) {
                    throw new Error('Invalid response format from Mojang API');
                }
                
                cachedVersions = data.versions;
                lastFetchTime = now;
            } catch (fetchError) {
                if (fetchError.name === 'AbortError') {
                    throw new Error('Request timed out');
                }
                throw fetchError;
            }
        }
        
        if (!cachedVersions) {
            throw new Error('Failed to retrieve version information');
        }
        
        let filteredVersions = cachedVersions;
        
        if (options.type) {
            const requestedType = options.type.toLowerCase();
            filteredVersions = filteredVersions.filter(version => 
                version.type.toLowerCase() === requestedType
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