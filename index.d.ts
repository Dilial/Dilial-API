declare module "dilial-api" {
    export interface Version {
        id: string;
        releaseTime: string;
        type: string;
    }

    export interface VersionOptions {
        type?: string;
    }

    export interface PlayerSkin {
        uuid: string;
        username: string;
        skinUrl: string | null;
        capeUrl: string | null;
        isSlimModel: boolean;
        texturesRaw: string;
        timestamp: string;
        renders: {
            head: {
                front: string;
                full: string;
            };
            body: {
                front: string;
                cape: string | null;
            };
        };
        error?: string;
    }

    export interface PlayerSkinOptions {
        username: string;
    }

    export interface PlayerHead {
        uuid: string;
        username: string;
        headImageUrl: string;
        head3dUrl: string;
        timestamp: string;
        error?: string;
    }

    export interface Account {
        uuid: string;
        username: string;
        type: string;
        active: boolean;
        lastUsed: string;
    }

    export interface AuthData {
        accessToken: string;
        clientToken: string;
        uuid: string;
        username: string;
        refreshToken?: string;
        expiresAt?: number;
        profile?: any;
        type: string;
    }

    export interface AuthorizationUrl {
        url: string;
        state: string;
    }

    export function getVersions(options?: VersionOptions): Promise<Version[] | { error: string }>;
    export function getPlayerSkin(options: PlayerSkinOptions): Promise<PlayerSkin | { error: string }>;
    export function getPlayerHead(options: PlayerSkinOptions): Promise<PlayerHead | { error: string }>;

    export const accounts: {
        addAccount(authData: AuthData): Promise<boolean>;
        removeAccount(uuid: string): boolean;
        getAccounts(): Account[];
        getActiveAccount(): Account | null;
        setActiveAccount(uuid: string): boolean;
        getAuthData(uuid?: string): AuthData | null;
        updateAuthData(uuid: string, authData: Partial<AuthData>): boolean;
    };

    export const auth: {
        mojangAuthenticate(username: string, password: string): Promise<AuthData>;
        microsoftAuthenticateWithCode(code: string, redirectUri: string): Promise<AuthData>;
        microsoftGenerateAuthUrl(redirectUri: string): Promise<AuthorizationUrl>;
        refreshMicrosoftToken(uuid: string): Promise<AuthData>;
        validateToken(uuid?: string): Promise<boolean>;
        logoutAccount(uuid?: string): Promise<boolean>;
    };
}