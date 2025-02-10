document.addEventListener('DOMContentLoaded', async () => {
    console.log("✅ DOMContentLoaded event fired");

    // Enhanced SDK verification
    const verifySDK = () => {
        if (!window.createAuth0Client) {
            console.error("❌ Auth0 SDK missing. Diagnostics:");
            console.log("1. Script tags:", document.querySelectorAll('script[src*=\"auth0\"]'));
            console.log("2. Network requests:", performance.getEntriesByType("resource"));
            console.log("3. CSP violations:", window.securityPolicyViolation);
            return false;
        }
        return true;
    };

    // Retry mechanism for SDK loading
    const waitForSDK = (retries = 3, delay = 500) => {
        return new Promise((resolve, reject) => {
            const check = (attempt) => {
                if (verifySDK()) return resolve();
                if (attempt >= retries) return reject();
                setTimeout(() => check(attempt + 1), delay);
            };
            check(0);
        });
    };

    try {
        await waitForSDK();
        console.log("Auth0 SDK version:", window.Auth0Client?.VERSION || 'Unknown version loaded');
    } catch {
        document.body.innerHTML = `
            <h1 style="color: red">Error: Authentication System Unavailable</h1>
            <p>Please try:</p>
            <ul>
                <li>Disable ad blockers</li>
                <li>Check internet connection</li>
                <li>Refresh the page (Ctrl+F5)</li>
            </ul>
        `;
        return;
    }

    // Rest of your Auth0 configuration
    let auth0Client = null;
    const config = {
        domain: "dev-h4hncqco2n4yrt6z.us.auth0.com",
        client_id: "eUlv5NFe6rjQbLztvS8MsikdIlznueaU",
        redirect_uri: window.location.origin + "/indexsignedin.html",
        cacheLocation: "localstorage",
        useRefreshTokens: true
    };

    try {
        auth0Client = await createAuth0Client(config);
        console.log("Auth0 initialized");
    } catch (error) {
        console.error("Auth0 init failed:", error);
        return;
    }

    // Existing authentication logic
    const handleAuthCallback = async () => {
        const isCallback = window.location.search.includes("code=");
        
        if (isCallback) {
            console.log("Handling auth callback...");
            try {
                const { appState } = await auth0Client.handleRedirectCallback();
                window.history.replaceState({}, document.title, "/indexsignedin.html");
                if (appState?.target) {
                    window.location.href = appState.target;
                }
            } catch (error) {
                console.error("Callback handling failed:", error);
                window.location.href = "/index.html";
            }
        }
    };

    const loginWithProvider = async (connection) => {
        try {
            await auth0Client.loginWithRedirect({
                redirect_uri: config.redirect_uri,
                connection: connection,
                appState: { target: window.location.pathname }
            });
        } catch (error) {
            console.error(`${connection} login failed:`, error);
        }
    };

    const logout = () => {
        auth0Client.logout({
            returnTo: window.location.origin
        });
    };

    const updateUI = async () => {
        const isAuthenticated = await auth0Client.isAuthenticated();
        
        document.getElementById('btn-logout').style.display = isAuthenticated ? "block" : "none";
        document.querySelectorAll('.auth-buttons button:not(#btn-logout)').forEach(btn => {
            btn.style.display = isAuthenticated ? "none" : "block";
        });

        console.log("UI updated, authenticated:", isAuthenticated);
    };

    const setupEventListeners = () => {
        document.getElementById('btn-login-github')?.addEventListener('click', () => loginWithProvider('github'));
        document.getElementById('btn-login-google')?.addEventListener('click', () => loginWithProvider('google-oauth2'));
        document.getElementById('btn-login-figma')?.addEventListener('click', () => loginWithProvider('figma'));
        document.getElementById('btn-logout')?.addEventListener('click', logout);
    };

    try {
        await handleAuthCallback();
        setupEventListeners();
        await updateUI();
        
        // For indexsignedin.html specific logic
        if (window.location.pathname.includes("indexsignedin")) {
            console.log("Welcome to protected page!");
            // Add any post-login specific logic here
        }
    } catch (error) {
        console.error("Main execution error:", error);
    }
});
