const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ACCOUNTS_DIR = path.join(os.homedir(), '.minecraft-launcher-accounts');
const ACCOUNTS_FILE = path.join(ACCOUNTS_DIR, 'accounts.json');
const ENCRYPTION_KEY_FILE = path.join(ACCOUNTS_DIR, '.key');
const ALGORITHM = 'aes-256-gcm';

let encryptionKey = null;
let accounts = [];
let activeAccount = null;

function initializeAccountStorage() {
    try {
        if (!fs.existsSync(ACCOUNTS_DIR)) {
            fs.mkdirSync(ACCOUNTS_DIR, { recursive: true, mode: 0o700 });
        }
        
        if (!fs.existsSync(ENCRYPTION_KEY_FILE)) {
            const newKey = crypto.randomBytes(32);
            fs.writeFileSync(ENCRYPTION_KEY_FILE, newKey, { mode: 0o600 });
            encryptionKey = newKey;
        } else {
            encryptionKey = fs.readFileSync(ENCRYPTION_KEY_FILE);
        }
        
        fs.chmodSync(ENCRYPTION_KEY_FILE, 0o600);
        
        if (fs.existsSync(ACCOUNTS_FILE)) {
            const encryptedData = fs.readFileSync(ACCOUNTS_FILE, 'utf8');
            if (encryptedData.trim()) {
                accounts = JSON.parse(decrypt(encryptedData));
                activeAccount = accounts.find(acc => acc.active) || null;
            }
        } else {
            fs.writeFileSync(ACCOUNTS_FILE, encrypt(JSON.stringify([])), { mode: 0o600 });
        }
        
        fs.chmodSync(ACCOUNTS_FILE, 0o600);
        return true;
    } catch (error) {
        console.error("Error initializing account storage:", error.message);
        return false;
    }
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

function saveAccounts() {
    try {
        const encryptedData = encrypt(JSON.stringify(accounts));
        fs.writeFileSync(ACCOUNTS_FILE, encryptedData, { mode: 0o600 });
        return true;
    } catch (error) {
        console.error("Error saving accounts:", error.message);
        return false;
    }
}

async function addAccount(authData) {
    try {
        if (!encryptionKey) {
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
        if (!encryptionKey) {
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
        if (!encryptionKey) {
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
        if (!encryptionKey) {
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
        if (!encryptionKey) {
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
        if (!encryptionKey) {
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
        if (!encryptionKey) {
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
    updateAuthData
}; 