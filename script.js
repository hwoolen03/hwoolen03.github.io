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
        redirect_uri: "https://hwoolen03.github.io/indexsignedin",
        cacheLocation: "localstorage",  // Store session in local storage
        useRefreshTokens: true  // Allows using refresh tokens to maintain the session
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
                const { appState } = await auth0Client.handleRedirectCallback();
                console.log("Received state:", appState?.state);
                if (storedState !== appState?.state) {
                    throw new Error('Invalid state');
                }
                console.log("✅ Redirect handled successfully.");
                window.history.replaceState({}, document.title, window.location.origin);  // Remove the query params after redirect
                await updateAuthUI();  // Ensure the UI updates after the redirect
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
                scope: 'openid profile email',
                response_type: 'code',
                state: state,
                nonce: generateRandomNonce(),
                code_challenge: generateCodeChallenge(),
                code_challenge_method: 'S256',
            });
        },
        google: () => {
            const state = generateRandomState();
            sessionStorage.setItem('auth_state', state);
            auth0Client.loginWithRedirect({
                connection: 'google-oauth2',
                scope: 'openid profile email',
                response_type: 'code',
                state: state,
                nonce: generateRandomNonce(),
                code_challenge: generateCodeChallenge(),
                code_challenge_method: 'S256',
            });
        },
        figma: () => {
            const state = generateRandomState();
            sessionStorage.setItem('auth_state', state);
            auth0Client.loginWithRedirect({
                connection: 'figma',
                scope: 'openid profile email',
                response_type: 'code',
                state: state,
                nonce: generateRandomNonce(),
                code_challenge: generateCodeChallenge(),
                code_challenge_method: 'S256',
            });
        }
    };

    // Helper functions for generating state, nonce, and code challenge
    const generateRandomState = () => {
        const state = btoa(Math.random().toString(36).substring(2));  // Base64-encoded random string
        console.log("Generated state:", state);
        return state;
    };

    const generateRandomNonce = () => {
        return btoa(Math.random().toString(36).substring(2));  // Base64-encoded random string
    };

    const generateCodeChallenge = () => {
        const codeVerifier = Math.random().toString(36).substring(2);
        return btoa(codeVerifier);  // Base64-encoded code verifier
    };

    const logoutHandler = () => {
        auth0Client.logout({ returnTo: window.location.origin });
    };

    // UI Management
    const updateAuthUI = async () => {
        const isAuthenticated = await auth0Client.isAuthenticated();
        console.log("🔄 Authentication status:", isAuthenticated);

        document.getElementById('btn-logout').style.display = isAuthenticated ? "block" : "none";
        document.querySelectorAll('.auth-buttons button:not(#btn-logout)').forEach(btn => {
            btn.style.display = isAuthenticated ? "none" : "block";
        });

        if (isAuthenticated) {
            const user = await auth0Client.getUser();
            console.log("👤 Authenticated user:", user);
        }
    };

    // Add class to body based on auth state
    const updateAuthState = async () => {
        const isAuthed = await auth0Client.isAuthenticated();
        document.body.classList.toggle('authenticated', isAuthed);
        document.body.classList.toggle('unauthenticated', !isAuthed);
        
        document.querySelectorAll('.auth-btn').forEach(btn => {
            btn.style.display = 'block';
            btn.style.visibility = 'visible';
        });
    };

    // Event Listeners
    const initializeApp = () => {
        console.log("🎯 Initializing event listeners...");

        const githubBtn = document.getElementById('btn-login-github');
        const googleBtn = document.getElementById('btn-login-google');
        const figmaBtn = document.getElementById('btn-login-figma');
        const logoutBtn = document.getElementById('btn-logout');

        if (!githubBtn || !googleBtn || !figmaBtn || !logoutBtn) {
            console.error("🚨 One or more buttons are missing from the DOM!");
            return;
        }

        githubBtn.addEventListener('click', loginHandlers.github);
        googleBtn.addEventListener('click', loginHandlers.google);
        figmaBtn.addEventListener('click', loginHandlers.figma);
        logoutBtn.addEventListener('click', logoutHandler);

        updateAuthUI();
    };

    // Main Execution Flow
    try {
        await handleAuthRedirect();  // Handle any potential redirect callback
        initializeApp();  // Initialize app event listeners
    } catch (error) {
        console.error("🚨 Application initialization failed:", error);
    }

    window.addEventListener('load', async () => {
        try {
            await auth0Client.checkSession();
            await updateAuthState();
        } catch (error) {
            console.error('Auth check failed:', error);
            document.body.classList.add('unauthenticated');
        }
    });
});

// Updated script.js
document.addEventListener('DOMContentLoaded', async () => {
    const auth0Client = await createAuth0Client({
        domain: "dev-h4hncqco2n4yrt6z.us.auth0.com",
        client_id: "eUlv5NFe6rjQbLztvS8MsikdIlznueaU",
        redirect_uri: "https://hwoolen03.github.io/indexsignedin"
    });

    if (window.location.search.includes("code=")) {
        await auth0Client.handleRedirectCallback();
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    const updateUI = async () => {
        const isAuthenticated = await auth0Client.isAuthenticated();
        
        document.querySelectorAll('.auth-button').forEach(button => {
            button.classList.add('hidden');
        });

        if (isAuthenticated) {
            document.getElementById('btn-logout').classList.remove('hidden');
        } else {
            document.getElementById('btn-login-github').classList.remove('hidden');
            document.getElementById('btn-login-google').classList.remove('hidden');
            document.getElementById('btn-login-figma').classList.remove('hidden');
        }
    };

    document.getElementById('btn-login-github').addEventListener('click', () => 
        auth0Client.loginWithRedirect({ connection: 'github' }));
    document.getElementById('btn-login-google').addEventListener('click', () => 
        auth0Client.loginWithRedirect({ connection: 'google-oauth2' }));
    document.getElementById('btn-login-figma').addEventListener('click', () => 
        auth0Client.loginWithRedirect({ connection: 'figma' }));
    document.getElementById('btn-logout').addEventListener('click', () => 
        auth0Client.logout({ returnTo: window.location.origin }));

    await updateUI();
});
