const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

let encryptionKey = null;
let accounts = [];
let activeAccount = null;
let storageConfig = {
    type: 'file',
    location: path.join(os.homedir(), '.minecraft-launcher-accounts'),
    electronStore: null,
    customHandler: null,
    initialized: false
};

const ALGORITHM = 'aes-256-gcm';
const ACCOUNTS_FILE_NAME = 'accounts.json';
const ENCRYPTION_KEY_FILE_NAME = '.key';

function getAccountsFilePath() {
    return path.join(storageConfig.location, ACCOUNTS_FILE_NAME);
}

function getKeyFilePath() {
    return path.join(storageConfig.location, ENCRYPTION_KEY_FILE_NAME);
}

function encrypt(text) {
    try {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv);
        
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag().toString('hex');
        
        return JSON.stringify({
            iv: iv.toString('hex'),
            encrypted,
            authTag
        });
    } catch (error) {
        throw new Error(`Encryption error: ${error.message}`);
    }
}

function decrypt(encryptedJson) {
    try {
        const { iv, encrypted, authTag } = JSON.parse(encryptedJson);
        
        const decipher = crypto.createDecipheriv(
            ALGORITHM, 
            encryptionKey, 
            Buffer.from(iv, 'hex')
        );
        
        decipher.setAuthTag(Buffer.from(authTag, 'hex'));
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        throw new Error(`Decryption error: ${error.message}`);
    }
}

function readEncryptedData() {
    try {
        switch (storageConfig.type) {
            case 'file':
                if (fs.existsSync(getAccountsFilePath())) {
                    const encryptedData = fs.readFileSync(getAccountsFilePath(), 'utf8');
                    if (encryptedData.trim()) {
                        return encryptedData;
                    }
                }
                break;
            case 'electron':
                if (storageConfig.electronStore && storageConfig.electronStore.has('accounts')) {
                    return storageConfig.electronStore.get('accounts');
                }
                break;
            case 'custom':
                if (storageConfig.customHandler && typeof storageConfig.customHandler.read === 'function') {
                    return storageConfig.customHandler.read();
                }
                break;
        }
        return null;
    } catch (error) {
        console.error("Error reading encrypted data:", error.message);
        return null;
    }
}

function writeEncryptedData(encryptedData) {
    try {
        switch (storageConfig.type) {
            case 'file':
                fs.writeFileSync(getAccountsFilePath(), encryptedData, { mode: 0o600 });
                break;
            case 'electron':
                if (storageConfig.electronStore) {
                    storageConfig.electronStore.set('accounts', encryptedData);
                }
                break;
            case 'custom':
                if (storageConfig.customHandler && typeof storageConfig.customHandler.write === 'function') {
                    storageConfig.customHandler.write(encryptedData);
                }
                break;
        }
        return true;
    } catch (error) {
        console.error("Error writing encrypted data:", error.message);
        return false;
    }
}

function readEncryptionKey() {
    try {
        switch (storageConfig.type) {
            case 'file':
                if (fs.existsSync(getKeyFilePath())) {
                    return fs.readFileSync(getKeyFilePath());
                }
                break;
            case 'electron':
                if (storageConfig.electronStore && storageConfig.electronStore.has('encryptionKey')) {
                    const keyStr = storageConfig.electronStore.get('encryptionKey');
                    return Buffer.from(keyStr, 'hex');
                }
                break;
            case 'custom':
                if (storageConfig.customHandler && typeof storageConfig.customHandler.readKey === 'function') {
                    return storageConfig.customHandler.readKey();
                }
                break;
        }
        return null;
    } catch (error) {
        console.error("Error reading encryption key:", error.message);
        return null;
    }
}

function writeEncryptionKey(key) {
    try {
        switch (storageConfig.type) {
            case 'file':
                fs.writeFileSync(getKeyFilePath(), key, { mode: 0o600 });
                fs.chmodSync(getKeyFilePath(), 0o600);
                break;
            case 'electron':
                if (storageConfig.electronStore) {
                    const keyStr = key.toString('hex');
                    storageConfig.electronStore.set('encryptionKey', keyStr);
                }
                break;
            case 'custom':
                if (storageConfig.customHandler && typeof storageConfig.customHandler.writeKey === 'function') {
                    storageConfig.customHandler.writeKey(key);
                }
                break;
        }
        return true;
    } catch (error) {
        console.error("Error writing encryption key:", error.message);
        return false;
    }
}

function generateNewEncryptionKey() {
    return crypto.randomBytes(32);
}

function saveAccounts() {
    try {
        if (storageConfig.type === 'memory') {
            return true;
        }
        
        const encryptedData = encrypt(JSON.stringify(accounts));
        return writeEncryptedData(encryptedData);
    } catch (error) {
        console.error("Error saving accounts:", error.message);
        return false;
    }
}

function initializeAccountStorage() {
    try {
        if (storageConfig.initialized) return true;
        
        if (storageConfig.type === 'file') {
            if (!fs.existsSync(storageConfig.location)) {
                fs.mkdirSync(storageConfig.location, { recursive: true, mode: 0o700 });
            }
        }
        
        let existingKey = readEncryptionKey();
        
        if (!existingKey) {
            encryptionKey = generateNewEncryptionKey();
            writeEncryptionKey(encryptionKey);
        } else {
            encryptionKey = existingKey;
        }
        
        const encryptedData = readEncryptedData();
        
        if (encryptedData) {
            try {
                accounts = JSON.parse(decrypt(encryptedData));
                activeAccount = accounts.find(acc => acc.active) || null;
            } catch (error) {
                console.error("Error parsing account data, resetting accounts:", error.message);
                accounts = [];
                activeAccount = null;
                saveAccounts();
            }
        } else {
            accounts = [];
            activeAccount = null;
            saveAccounts();
        }
        
        storageConfig.initialized = true;
        return true;
    } catch (error) {
        console.error("Error initializing account storage:", error.message);
        return false;
    }
}

function configureStorage(config = {}) {
    if (config.type && ['file', 'electron', 'memory', 'custom'].includes(config.type)) {
        storageConfig.type = config.type;
    }
    
    if (config.location && typeof config.location === 'string') {
        storageConfig.location = config.location;
    }
    
    if (config.electronStore) {
        storageConfig.electronStore = config.electronStore;
    }
    
    if (config.customHandler) {
        storageConfig.customHandler = config.customHandler;
    }
    
    storageConfig.initialized = false;
    return initializeAccountStorage();
}

async function addAccount(authData) {
    try {
        if (!storageConfig.initialized) {
            if (!initializeAccountStorage()) {
                throw new Error("Could not initialize account storage");
            }
        }
        
        if (!authData || !authData.accessToken || !authData.clientToken || !authData.uuid) {
            throw new Error("Invalid authentication data");
        }
        
        const existingAccount = accounts.findIndex(acc => acc.uuid === authData.uuid);
        
        const account = {
            uuid: authData.uuid,
            username: authData.username,
            type: authData.type || 'mojang',
            accessToken: authData.accessToken,
            clientToken: authData.clientToken,
            refreshToken: authData.refreshToken || null,
            expiresAt: authData.expiresAt || null,
            profile: authData.profile || null,
            active: true,
            lastUsed: new Date().toISOString()
        };
        
        if (existingAccount >= 0) {
            accounts[existingAccount] = account;
        } else {
            accounts.forEach(acc => acc.active = false);
            accounts.push(account);
        }
        
        activeAccount = account;
        return saveAccounts();
    } catch (error) {
        console.error("Error adding account:", error.message);
        return false;
    }
}

function removeAccount(uuid) {
    try {
        if (!storageConfig.initialized) {
            if (!initializeAccountStorage()) {
                throw new Error("Could not initialize account storage");
            }
        }
        
        const initialLength = accounts.length;
        accounts = accounts.filter(acc => acc.uuid !== uuid);
        
        if (accounts.length === initialLength) {
            return false;
        }
        
        if (activeAccount && activeAccount.uuid === uuid) {
            if (accounts.length > 0) {
                accounts[0].active = true;
                activeAccount = accounts[0];
            } else {
                activeAccount = null;
            }
        }
        
        return saveAccounts();
    } catch (error) {
        console.error("Error removing account:", error.message);
        return false;
    }
}

function getAccounts() {
    try {
        if (!storageConfig.initialized) {
            if (!initializeAccountStorage()) {
                throw new Error("Could not initialize account storage");
            }
        }
        
        return accounts.map(acc => ({
            uuid: acc.uuid,
            username: acc.username,
            type: acc.type,
            active: acc.active,
            lastUsed: acc.lastUsed
        }));
    } catch (error) {
        console.error("Error getting accounts:", error.message);
        return [];
    }
}

function getActiveAccount() {
    try {
        if (!storageConfig.initialized) {
            if (!initializeAccountStorage()) {
                throw new Error("Could not initialize account storage");
            }
        }
        
        if (!activeAccount) {
            return null;
        }
        
        return {
            uuid: activeAccount.uuid,
            username: activeAccount.username,
            type: activeAccount.type,
            active: activeAccount.active,
            lastUsed: activeAccount.lastUsed
        };
    } catch (error) {
        console.error("Error getting active account:", error.message);
        return null;
    }
}

function setActiveAccount(uuid) {
    try {
        if (!storageConfig.initialized) {
            if (!initializeAccountStorage()) {
                throw new Error("Could not initialize account storage");
            }
        }
        
        const account = accounts.find(acc => acc.uuid === uuid);
        if (!account) {
            return false;
        }
        
        accounts.forEach(acc => acc.active = (acc.uuid === uuid));
        activeAccount = account;
        return saveAccounts();
    } catch (error) {
        console.error("Error setting active account:", error.message);
        return false;
    }
}

function getAuthData(uuid = null) {
    try {
        if (!storageConfig.initialized) {
            if (!initializeAccountStorage()) {
                throw new Error("Could not initialize account storage");
            }
        }
        
        const account = uuid ? accounts.find(acc => acc.uuid === uuid) : activeAccount;
        
        if (!account) {
            return null;
        }
        
        return {
            accessToken: account.accessToken,
            clientToken: account.clientToken,
            uuid: account.uuid,
            username: account.username,
            refreshToken: account.refreshToken,
            expiresAt: account.expiresAt,
            profile: account.profile,
            type: account.type
        };
    } catch (error) {
        console.error("Error getting auth data:", error.message);
        return null;
    }
}

function updateAuthData(uuid, authData) {
    try {
        if (!storageConfig.initialized) {
            if (!initializeAccountStorage()) {
                throw new Error("Could not initialize account storage");
            }
        }
        
        const accountIndex = accounts.findIndex(acc => acc.uuid === uuid);
        
        if (accountIndex === -1) {
            return false;
        }
        
        if (authData.accessToken) {
            accounts[accountIndex].accessToken = authData.accessToken;
        }
        
        if (authData.refreshToken) {
            accounts[accountIndex].refreshToken = authData.refreshToken;
        }
        
        if (authData.expiresAt) {
            accounts[accountIndex].expiresAt = authData.expiresAt;
        }
        
        if (authData.profile) {
            accounts[accountIndex].profile = authData.profile;
        }
        
        accounts[accountIndex].lastUsed = new Date().toISOString();
        
        if (activeAccount && activeAccount.uuid === uuid) {
            activeAccount = accounts[accountIndex];
        }
        
        return saveAccounts();
    } catch (error) {
        console.error("Error updating auth data:", error.message);
        return false;
    }
}

initializeAccountStorage();

module.exports = {
    addAccount,
    removeAccount,
    getAccounts,
    getActiveAccount,
    setActiveAccount,
    getAuthData,
    updateAuthData,
    configureStorage
}; 