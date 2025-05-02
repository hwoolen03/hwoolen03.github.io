document.addEventListener('DOMContentLoaded', async () => {
    console.log("✅ DOMContentLoaded event fired");

    if (!window.createAuth0Client) {
        console.error("Auth0 SDK failed to load.");
        document.body.innerHTML = `
            <h1 style="color: red">Service Unavailable</h1>
            <p>Authentication system is currently unavailable. Please try again later.</p>
        `;
        return;
    }

    let auth0Client = null;
    const config = {
        domain: "dev-h4hncqco2n4yrt6z.us.auth0.com",
        client_id: "eUlv5NFe6rjQbLztvS8MsikdIlznueaU",
        redirect_uri: "https://hwoolen03.github.io/indexsignedin", 
        cacheLocation: "localstorage", 
        useRefreshTokens: true 
    };

    try {
        auth0Client = await createAuth0Client(config);
        console.log("✅ Auth0 initialized");
    } catch (error) {
        console.error("🚨 Auth0 initialization failed:", error);
        return;
    }

    
    const handleAuthRedirect = async () => {
        const query = window.location.search;
        if (query.includes("code=") && query.includes("state=")) {
            try {
                const currentState = new URLSearchParams(window.location.search).get('state');
                const storedState = sessionStorage.getItem('auth_state');
                
                console.log("Current state from URL:", currentState);
                console.log("Stored state:", storedState);

                if (!storedState || storedState !== currentState) {
                    throw new Error('Invalid state - Authentication attempt may have been compromised');
                }

                await auth0Client.handleRedirectCallback();
                sessionStorage.removeItem('auth_state');
                window.history.replaceState({}, document.title, window.location.origin);
                await updateAuthUI();
            } catch (error) {
                console.error("🚨 Redirect handling failed:", error);
                sessionStorage.removeItem('auth_state');
                window.location.replace("https://hwoolen03.github.io");
            }
        }
    };

   
    const loginHandlers = {
        github: () => {
            const state = generateRandomState();
            sessionStorage.setItem('auth_state', state);
            console.log('Storing state before GitHub redirect:', state);
            
            auth0Client.loginWithRedirect({
                connection: 'github',
                authorizationParams: {
                    scope: 'openid profile email',
                    response_type: 'code',
                    state: state,
                    nonce: generateRandomNonce(),
                    redirect_uri: 'https://hwoolen03.github.io/indexsignedin'
                }
            });
        },
        google: () => {
            const state = generateRandomState();
            sessionStorage.setItem('auth_state', state);
            console.log('Storing state before Google redirect:', state);
            
            auth0Client.loginWithRedirect({
                connection: 'google-oauth2',
                authorizationParams: {
                    scope: 'openid profile email',
                    response_type: 'code',
                    state: state,
                    nonce: generateRandomNonce(),
                    redirect_uri: 'https://hwoolen03.github.io/indexsignedin'
                }
            });
        },
        figma: () => {
            const state = generateRandomState();
            sessionStorage.setItem('auth_state', state);
            console.log('Storing state before Figma redirect:', state);
            
            auth0Client.loginWithRedirect({
                connection: 'figma',
                authorizationParams: {
                    scope: 'openid profile email',
                    response_type: 'code',
                    state: state,
                    nonce: generateRandomNonce(),
                    redirect_uri: 'https://hwoolen03.github.io/indexsignedin'
                }
            });
        }
    };


    const generateRandomState = () => {
        const state = btoa(Math.random().toString(36).substring(2)); 
        console.log("Generated state:", state);
        return state;
    };

    const generateRandomNonce = () => {
        return btoa(Math.random().toString(36).substring(2)); 
    };

    const generateCodeChallenge = () => {
        const codeVerifier = Math.random().toString(36).substring(2);
        return btoa(codeVerifier); 
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

    const updateAuthState = async () => {
        const isAuthed = await auth0Client.isAuthenticated();
        document.body.classList.toggle('authenticated', isAuthed);
        document.body.classList.toggle('unauthenticated', !isAuthed);

        document.querySelectorAll('.auth-btn').forEach(btn => {
            btn.style.display = 'block';
            btn.style.visibility = 'visible';
        });
    };

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

    try {
        await handleAuthRedirect();  
        initializeApp();  
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
