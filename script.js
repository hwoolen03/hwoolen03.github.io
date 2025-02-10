document.addEventListener('DOMContentLoaded', async () => {
    console.log("✅ DOMContentLoaded event fired");

    // 1. Wait for Auth0 SDK to load
    const waitForAuth0SDK = (retries = 3, delay = 500) => {
        return new Promise((resolve, reject) => {
            const check = (attempt) => {
                if (window.createAuth0Client) return resolve();
                if (attempt >= retries) return reject(new Error('Auth0 SDK failed to load'));
                setTimeout(() => check(attempt + 1), delay);
            };
            check(0);
        });
    };

    try {
        await waitForAuth0SDK();
        console.log("Auth0 SDK version:", window.Auth0Client?.VERSION);
    } catch (error) {
        console.error("Critical Auth0 load failure:", error);
        document.body.innerHTML = `
            <h1 style="color: red">Service Unavailable</h1>
            <p>Authentication system is currently unavailable. Please try again later.</p>
        `;
        return;
    }

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
