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
    let auth0Client = null;
    const config = {
        domain: "dev-h4hncqco2n4yrt6z.us.auth0.com",
        client_id: "eUlv5NFe6rjQbLztvS8MsikdIlznueaU",
        redirect_uri: "https://hwoolen03.github.io/indexsignedin", // Keep consistent
        cacheLocation: "localstorage", // Store session in local storage
        useRefreshTokens: true // Allows using refresh tokens to maintain the session
    };

    try {
        auth0Client = await createAuth0Client(config);
        console.log("✅ Auth0 initialized");
    } catch (error) {
        console.error("🚨 Auth0 initialization failed:", error);
        return;
    }

    // Handle Authentication Redirect
    const handleAuthRedirect = async () => {
        const query = window.location.search;
        if (query.includes("code=") && query.includes("state=")) {
            try {
                const storedState = sessionStorage.getItem('auth_state');
                console.log("Stored state:", storedState);
                const { state: returnedState } = await auth0Client.handleRedirectCallback();
                console.log("Received state:", returnedState);
                if (storedState !== returnedState) {
                    throw new Error('Invalid state');
                }
                console.log("✅ Redirect handled successfully.");
                window.history.replaceState({}, document.title, window.location.origin); // Remove the query params after redirect
                await updateAuthUI(); // Ensure the UI updates after the redirect
            } catch (error) {
                console.error("🚨 Redirect handling failed:", error);
                window.location.replace("https://hwoolen03.github.io");
            }
        }
    };

    // Authentication Handlers
    const loginHandlers = {
        github: () => {
            const state = generateRandomState();
            sessionStorage.setItem('auth_state', state);
            auth0Client.loginWithRedirect({
                connection: 'github',
                authorizationParams: { // Move OAuth params here
                    scope: 'openid profile email',
                    response_type: 'code',
                    state: state,
                    nonce: generateRandomNonce(),
                    code_challenge: generateCodeChallenge(),
                    code_challenge_method: 'S256',
                }
            });
        },
        google: () => {
            const state = generateRandomState();
            sessionStorage.setItem('auth_state', state);
            auth0Client.loginWithRedirect({
                connection: 'google-oauth2',
                authorizationParams: { // Move OAuth params here
                    scope: 'openid profile email',
                    response_type: 'code',
                    state: state,
                    nonce: generateRandomNonce(),
                    code_challenge: generateCodeChallenge(),
                    code_challenge_method: 'S256',
                }
            });
        },
        figma: () => {
            const state = generateRandomState();
            sessionStorage.setItem('auth_state', state);
            auth0Client.loginWithRedirect({
                connection: 'figma',
                authorizationParams: { // Move OAuth params here
                    scope: 'openid profile email',
                    response_type: 'code',
                    state: state,
                    nonce: generateRandomNonce(),
                    code_challenge: generateCodeChallenge(),
                    code_challenge_method: 'S256',
                }
            });
        }
    };

    // Helper functions for generating state, nonce, and code challenge
    const generateRandomState = () => {
        const state = btoa(Math.random().toString(36).substring(2)); // Base64-encoded random string
        console.log("Generated state:", state);
        return state;
    };

    const generateRandomNonce = () => {
        return btoa(Math.random().toString(36).substring(2)); // Base64-encoded random string
    };

    const generateCodeChallenge = () => {
        const codeVerifier = Math.random().toString(36).substring(2);
        return btoa(codeVerifier); // Base64-encoded code verifier
    };

    const logoutHandler = () => {
        auth0Client.logout({ returnTo: window.location.origin });
    };

    // UI Management
    const updateAuthUI = async () => {
        const isAuthenticated = await auth0Client.isAuthenticated();
        console.log("🔄 Authentication status:", isAuthenticated);

        document.getElementById('btn-logout').style.display =
