document.addEventListener('DOMContentLoaded', async () => {
    console.log("✅ DOMContentLoaded event fired");

    // 1. Verify Auth0 SDK loading
    if (!window.createAuth0Client) {
        console.error("❌ Auth0 SDK not loaded. Check:");
        console.log("- Script URL: https://cdn.auth0.com/js/auth0-spa-js/2.0/auth0-spa-js.production.js");
        console.log("- Network tab for failed requests");
        console.log("- Browser console for CSP errors");
        return;
    }

    // 2. Auth0 configuration
    let auth0Client = null;
    const config = {
        domain: "dev-h4hncqco2n4yrt6z.us.auth0.com",
        client_id: "eUlv5NFe6rjQbLztvS8MsikdIlznueaU",
        redirect_uri: window.location.origin + "/indexsignedin.html",
        cacheLocation: "localstorage",
        useRefreshTokens: true
    };

    // 3. Initialize Auth0 client
    try {
        auth0Client = await createAuth0Client(config);
        console.log("Auth0 client initialized");
    } catch (error) {
        console.error("Auth0 initialization failed:", error);
        return;
    }

    // 4. Handle authentication callback
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

    // 5. Login handler
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

    // 6. Logout handler
    const logout = () => {
        auth0Client.logout({
            returnTo: window.location.origin
        });
    };

    // 7. UI state management
    const updateUI = async () => {
        const isAuthenticated = await auth0Client.isAuthenticated();
        
        document.getElementById('btn-logout').style.display = isAuthenticated ? "block" : "none";
        document.querySelectorAll('.auth-buttons button:not(#btn-logout)').forEach(btn => {
            btn.style.display = isAuthenticated ? "none" : "block";
        });

        console.log("UI updated, authenticated:", isAuthenticated);
    };

    // 8. Event listeners
    const setupEventListeners = () => {
        document.getElementById('btn-login-github')?.addEventListener('click', () => loginWithProvider('github'));
        document.getElementById('btn-login-google')?.addEventListener('click', () => loginWithProvider('google-oauth2'));
        document.getElementById('btn-login-figma')?.addEventListener('click', () => loginWithProvider('figma'));
        document.getElementById('btn-logout')?.addEventListener('click', logout);
    };

    // 9. Main execution flow
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
