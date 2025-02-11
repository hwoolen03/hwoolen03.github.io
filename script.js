document.addEventListener('DOMContentLoaded', async () => {
    console.log("✅ DOMContentLoaded event fired");

    // Ensure Auth0 SDK is available
    if (!window.createAuth0Client) {
        console.error("Auth0 SDK failed to load.");
        document.body.innerHTML = `
            <h1 style="color: red">Service Unavailable</h1>
            <p>Authentication system is currently unavailable. Please try again later.</p>
        `;
        return;
    }

    // Auth0 Configuration
    const config = {
        domain: "dev-h4hncqco2n4yrt6z.us.auth0.com",
        client_id: "eUlv5NFe6rjQbLztvS8MsikdIlznueaU",
        redirect_uri: "https://hwoolen03.github.io/indexsignedin",  // Ensure this matches the Auth0 settings
        cacheLocation: "localstorage",
        useRefreshTokens: true
    };

    let auth0Client = null;

    try {
        auth0Client = await createAuth0Client(config);
        console.log("Auth0 initialized");
    } catch (error) {
        console.error("Auth0 init failed:", error);
        return;
    }

    // Handle Authentication Callback
    const handleAuthRedirect = async () => {
        const query = window.location.search;
        if (query.includes("code=") && query.includes("state=")) {
            try {
                await auth0Client.handleRedirectCallback();
                // Replace the current URL to remove query parameters
                window.history.replaceState({}, document.title, window.location.pathname);
                // Update the UI after successful authentication
                updateAuthUI();
            } catch (error) {
                console.error("Redirect handling failed:", error);
                // Redirect to the home page in case of error
                window.location.replace("https://hwoolen03.github.io");
            }
        }
    };

    // Authentication Handlers
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

    // UI Management
    const updateAuthUI = async () => {
        const isAuthenticated = await auth0Client.isAuthenticated();
        document.getElementById('btn-logout').style.display = isAuthenticated ? "block" : "none";
        document.querySelectorAll('.auth-buttons button:not(#btn-logout)').forEach(btn => {
            btn.style.display = isAuthenticated ? "none" : "block";
        });
    };

    // Event Listeners
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
