document.addEventListener('DOMContentLoaded', async () => {
    console.log("✅ DOMContentLoaded event fired");

    // 1. Load Auth0 SDK dynamically
    async function loadAuth0SDK() {
        const primarySDK = 'https://cdn.jsdelivr.net/npm/@auth0/auth0-spa-js@2.0.0/dist/auth0-spa-js.production.js';
        const fallbackSDK = '/js/auth0-spa-js.production.js';

        const loadScript = (url) => {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = url;
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        };

        try {
            await loadScript(primarySDK);
        } catch {
            try {
                await loadScript(fallbackSDK);
            } catch (error) {
                console.error('Both SDK sources failed:', error);
                document.body.innerHTML = `
                    <h1 style="color: red">Authentication System Error</h1>
                    <p>Please refresh the page or try again later.</p>
                `;
                return;
            }
        }
    }

    await loadAuth0SDK();

    if (!window.createAuth0Client) {
        console.error("Auth0 SDK failed to load.");
        return;
    }

    console.log("Auth0 SDK version:", window.Auth0Client?.VERSION);

    // 2. Auth0 Configuration
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

    // 3. Handle Authentication Callback
    const handleAuthRedirect = async () => {
        const query = window.location.search;
        if (query.includes("code=") && query.includes("state=")) {
            try {
                await auth0Client.handleRedirectCallback();
                window.history.replaceState({}, document.title, "/indexsignedin.html");
            } catch (error) {
                console.error("Redirect handling failed:", error);
                window.location.replace("/index.html");
            }
        }
    };

    // 4. Authentication Handlers
    const loginHandlers = {
        github: () => auth0Client.loginWithRedirect({ connection: 'github' }),
        google: () => auth0Client.loginWithRedirect({ connection: 'google-oauth2' }),
        figma: () => auth0Client.loginWithRedirect({ connection: 'figma' })
    };

    const logoutHandler = () => {
        auth0Client.logout({
            returnTo: window.location.origin
        });
    };

    // 5. UI Management
    const updateAuthUI = async () => {
        const isAuthenticated = await auth0Client.isAuthenticated();
        document.getElementById('btn-logout').style.display = isAuthenticated ? "block" : "none";
        document.querySelectorAll('.auth-buttons button:not(#btn-logout)').forEach(btn => {
            btn.style.display = isAuthenticated ? "none" : "block";
        });
    };

    // 6. Event Listeners
    const initializeApp = () => {
        // Login buttons
        document.getElementById('btn-login-github').addEventListener('click', loginHandlers.github);
        document.getElementById('btn-login-google').addEventListener('click', loginHandlers.google);
        document.getElementById('btn-login-figma').addEventListener('click', loginHandlers.figma);
        
        // Logout button
        document.getElementById('btn-logout').addEventListener('click', logoutHandler);
        
        // Initial UI update
        updateAuthUI();
    };

    // Main Execution Flow
    try {
        await handleAuthRedirect();
        initializeApp();
        
        // For signed-in page specific logic
        if (window.location.pathname.includes("indexsignedin")) {
            const user = await auth0Client.getUser();
            console.log("Authenticated user:", user);
        }
    } catch (error) {
        console.error("Application initialization failed:", error);
    }
});

