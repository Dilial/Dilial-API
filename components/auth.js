const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const accountManager = require('./accounts');

const ENDPOINTS = {
    MOJANG: {
        AUTH: 'https://authserver.mojang.com/authenticate',
        REFRESH: 'https://authserver.mojang.com/refresh',
        VALIDATE: 'https://authserver.mojang.com/validate',
        INVALIDATE: 'https://authserver.mojang.com/invalidate'
    },
    MICROSOFT: {
        AUTH: 'https://login.live.com/oauth20_token.srf',
        XBL: 'https://user.auth.xboxlive.com/user/authenticate',
        XSTS: 'https://xsts.auth.xboxlive.com/xsts/authorize',
        MINECRAFT: 'https://api.minecraftservices.com/authentication/login_with_xbox',
        PROFILE: 'https://api.minecraftservices.com/minecraft/profile'
    }
};

async function mojangAuthenticate(username, password) {
    try {
        if (!username || !password) {
            throw new Error('Username and password are required');
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
                username,
                password,
                clientToken
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.errorMessage || `Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.accessToken) {
            throw new Error('Invalid authentication response');
        }
        
        const authData = {
            accessToken: data.accessToken,
            clientToken: data.clientToken,
            uuid: data.selectedProfile.id,
            username: data.selectedProfile.name,
            type: 'mojang'
        };
        
        const added = await accountManager.addAccount(authData);
        if (!added) {
            throw new Error('Failed to save account');
        }
        
        return authData;
    } catch (error) {
        throw new Error(`Mojang authentication failed: ${error.message}`);
    }
}

async function microsoftAuthenticateWithCode(code, redirectUri) {
    try {
        if (!code || !redirectUri) {
            throw new Error('Authorization code and redirect URI are required');
        }
        
        const clientId = process.env.MS_CLIENT_ID;
        if (!clientId) {
            throw new Error('Microsoft client ID is not configured');
        }
        
        const tokenResponse = await fetch(ENDPOINTS.MICROSOFT.AUTH, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: clientId,
                code,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri
            })
        });
        
        if (!tokenResponse.ok) {
            throw new Error(`Failed to get Microsoft token: ${tokenResponse.status}`);
        }
        
        const tokenData = await tokenResponse.json();
        
        const xblResponse = await fetch(ENDPOINTS.MICROSOFT.XBL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                Properties: {
                    AuthMethod: 'RPS',
                    SiteName: 'user.auth.xboxlive.com',
                    RpsTicket: `d=${tokenData.access_token}`
                },
                RelyingParty: 'http://auth.xboxlive.com',
                TokenType: 'JWT'
            })
        });
        
        if (!xblResponse.ok) {
            throw new Error(`Failed to authenticate with Xbox Live: ${xblResponse.status}`);
        }
        
        const xblData = await xblResponse.json();
        
        const xstsResponse = await fetch(ENDPOINTS.MICROSOFT.XSTS, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                Properties: {
                    SandboxId: 'RETAIL',
                    UserTokens: [xblData.Token]
                },
                RelyingParty: 'rp://api.minecraftservices.com/',
                TokenType: 'JWT'
            })
        });
        
        if (!xstsResponse.ok) {
            const xstsError = await xstsResponse.json();
            if (xstsError.XErr === 2148916233) {
                throw new Error('The Microsoft account does not have an Xbox account');
            }
            throw new Error(`Failed to get XSTS token: ${xstsResponse.status}`);
        }
        
        const xstsData = await xstsResponse.json();
        
        const minecraftResponse = await fetch(ENDPOINTS.MICROSOFT.MINECRAFT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                identityToken: `XBL3.0 x=${xblData.DisplayClaims.xui[0].uhs};${xstsData.Token}`
            })
        });
        
        if (!minecraftResponse.ok) {
            throw new Error(`Failed to authenticate with Minecraft: ${minecraftResponse.status}`);
        }
        
        const minecraftData = await minecraftResponse.json();
        
        const profileResponse = await fetch(ENDPOINTS.MICROSOFT.PROFILE, {
            headers: {
                'Authorization': `Bearer ${minecraftData.access_token}`
            }
        });
        
        if (!profileResponse.ok) {
            if (profileResponse.status === 404) {
                throw new Error('You need to buy Minecraft to continue');
            }
            throw new Error(`Failed to get Minecraft profile: ${profileResponse.status}`);
        }
        
        const profileData = await profileResponse.json();
        
        const authData = {
            accessToken: minecraftData.access_token,
            clientToken: uuidv4(),
            refreshToken: tokenData.refresh_token,
            expiresAt: Date.now() + (tokenData.expires_in * 1000),
            uuid: profileData.id,
            username: profileData.name,
            profile: profileData,
            type: 'microsoft'
        };
        
        const added = await accountManager.addAccount(authData);
        if (!added) {
            throw new Error('Failed to save account');
        }
        
        return authData;
    } catch (error) {
        throw new Error(`Microsoft authentication failed: ${error.message}`);
    }
}

async function microsoftGenerateAuthUrl(redirectUri) {
    try {
        const clientId = process.env.MS_CLIENT_ID;
        if (!clientId) {
            throw new Error('Microsoft client ID is not configured');
        }
        
        const state = crypto.randomBytes(16).toString('hex');
        
        const params = new URLSearchParams({
            client_id: clientId,
            response_type: 'code',
            redirect_uri: redirectUri,
            scope: 'XboxLive.signin offline_access',
            state
        });
        
        return {
            url: `https://login.live.com/oauth20_authorize.srf?${params.toString()}`,
            state
        };
    } catch (error) {
        throw new Error(`Failed to generate Microsoft auth URL: ${error.message}`);
    }
}

async function refreshMicrosoftToken(uuid) {
    try {
        const authData = accountManager.getAuthData(uuid);
        
        if (!authData || !authData.refreshToken) {
            throw new Error('No refresh token available');
        }
        
        const clientId = process.env.MS_CLIENT_ID;
        if (!clientId) {
            throw new Error('Microsoft client ID is not configured');
        }
        
        const tokenResponse = await fetch(ENDPOINTS.MICROSOFT.AUTH, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: clientId,
                refresh_token: authData.refreshToken,
                grant_type: 'refresh_token'
            })
        });
        
        if (!tokenResponse.ok) {
            throw new Error(`Failed to refresh token: ${tokenResponse.status}`);
        }
        
        const tokenData = await tokenResponse.json();
        
        const xblResponse = await fetch(ENDPOINTS.MICROSOFT.XBL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                Properties: {
                    AuthMethod: 'RPS',
                    SiteName: 'user.auth.xboxlive.com',
                    RpsTicket: `d=${tokenData.access_token}`
                },
                RelyingParty: 'http://auth.xboxlive.com',
                TokenType: 'JWT'
            })
        });
        
        if (!xblResponse.ok) {
            throw new Error(`Failed to authenticate with Xbox Live: ${xblResponse.status}`);
        }
        
        const xblData = await xblResponse.json();
        
        const xstsResponse = await fetch(ENDPOINTS.MICROSOFT.XSTS, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                Properties: {
                    SandboxId: 'RETAIL',
                    UserTokens: [xblData.Token]
                },
                RelyingParty: 'rp://api.minecraftservices.com/',
                TokenType: 'JWT'
            })
        });
        
        if (!xstsResponse.ok) {
            throw new Error(`Failed to get XSTS token: ${xstsResponse.status}`);
        }
        
        const xstsData = await xstsResponse.json();
        
        const minecraftResponse = await fetch(ENDPOINTS.MICROSOFT.MINECRAFT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                identityToken: `XBL3.0 x=${xblData.DisplayClaims.xui[0].uhs};${xstsData.Token}`
            })
        });
        
        if (!minecraftResponse.ok) {
            throw new Error(`Failed to authenticate with Minecraft: ${minecraftResponse.status}`);
        }
        
        const minecraftData = await minecraftResponse.json();
        
        const updatedAuthData = {
            accessToken: minecraftData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresAt: Date.now() + (tokenData.expires_in * 1000)
        };
        
        const updated = accountManager.updateAuthData(uuid, updatedAuthData);
        if (!updated) {
            throw new Error('Failed to update account auth data');
        }
        
        return accountManager.getAuthData(uuid);
    } catch (error) {
        throw new Error(`Token refresh failed: ${error.message}`);
    }
}

async function validateToken(uuid = null) {
    try {
        const authData = uuid ? accountManager.getAuthData(uuid) : accountManager.getAuthData();
        
        if (!authData) {
            return false;
        }
        
        if (authData.type === 'microsoft') {
            if (authData.expiresAt && authData.expiresAt > Date.now()) {
                return true;
            }
            
            try {
                await refreshMicrosoftToken(authData.uuid);
                return true;
            } catch (refreshError) {
                return false;
            }
        } else {
            const response = await fetch(ENDPOINTS.MOJANG.VALIDATE, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    accessToken: authData.accessToken,
                    clientToken: authData.clientToken
                })
            });
            
            return response.status === 204;
        }
    } catch (error) {
        return false;
    }
}

async function logoutAccount(uuid = null) {
    try {
        const authData = uuid ? accountManager.getAuthData(uuid) : accountManager.getAuthData();
        
        if (!authData) {
            return false;
        }
        
        if (authData.type === 'mojang') {
            try {
                await fetch(ENDPOINTS.MOJANG.INVALIDATE, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        accessToken: authData.accessToken,
                        clientToken: authData.clientToken
                    })
                });
            } catch (error) {
                console.warn('Failed to invalidate token on Mojang servers. Continuing with local logout.');
            }
        }
        
        return accountManager.removeAccount(authData.uuid);
    } catch (error) {
        console.error("Error logging out:", error.message);
        return false;
    }
}

module.exports = {
    mojangAuthenticate,
    microsoftAuthenticateWithCode,
    microsoftGenerateAuthUrl,
    refreshMicrosoftToken,
    validateToken,
    logoutAccount
}; 