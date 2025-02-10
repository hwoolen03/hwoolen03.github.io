// Make sure this function is only called after the SDK has been loaded
const initializeApp = async () => {
    let auth0Client = null;
    const redirectUri = "https://hwoolen03.github.io/indexsignedin.html";

    // Ensure that the createAuth0Client function is available
    if (typeof createAuth0Client === 'undefined') {
        console.error("⚠️ Auth0 SDK is not loaded properly.");
        return;
    }

    console.log("🔹 Configuring Auth0 client...");
    try {
        auth0Client = await createAuth0Client({
            domain: "dev-h4hncqco2n4yrt6z.us.auth0.com", // Your Auth0 domain
            client_id: "eUlv5NFe6rjQbLztvS8MsikdIlznueaU", // Your Auth0 client ID
            redirect_uri: redirectUri,
            cacheLocation: "localstorage",
            useRefreshTokens: true
        });
        console.log("✅ Auth0 client initialized:", auth0Client);
        await updateUI();
        handleAuthCallback();
    } catch (error) {
        console.error("⚠️ Error initializing Auth0 client:", error);
    }
};

// Login with selected provider (GitHub, Google, Figma)
const loginWithProvider = async (connection) => {
    console.log(`🔹 Login button clicked for ${connection}`);
    try {
        console.log("🔹 Redirecting to Auth0 login...");
        await auth0Client.loginWithRedirect({
            redirect_uri: redirectUri,
            connection: connection
        });
    } catch (error) {
        console.error("⚠️ Error during loginWithRedirect:", error);
    }
};

// Handle the callback after login
const handleAuthCallback = async () => {
    const query = new URLSearchParams(window.location.search);
    if (query.has("code")) {
        try {
            console.log("🔹 Handling Auth0 redirect callback...");
            await auth0Client.handleRedirectCallback();
            console.log("✅ Auth callback handled successfully!");
            window.history.replaceState({}, document.title, window.location.pathname); // Clean up URL
            await updateUI(); // Update UI after successful authentication
        } catch (error) {
            console.error("⚠️ Error handling Auth0 callback:", error);
        }
    }
};

// Update UI based on authentication state
const updateUI = async () => {
    const isAuthenticated = await auth0Client.isAuthenticated();
    console.log("✅ User authenticated:", isAuthenticated);

    // Toggle UI elements
    document.getElementById("btn-logout").style.display = isAuthenticated ? "block" : "none";
    document.getElementById("btn-login-github").style.display = !isAuthenticated ? "block" : "none";
    document.getElementById("btn-login-google").style.display = !isAuthenticated ? "block" : "none";
    document.getElementById("btn-login-figma").style.display = !isAuthenticated ? "block" : "none";

    if (isAuthenticated) {
        window.location.href = redirectUri; // Redirect to signed-in page
    }
};

// Event listeners for login buttons
document.getElementById('btn-login-github')?.addEventListener('click', () => {
    loginWithProvider('github');
});
document.getElementById('btn-login-google')?.addEventListener('click', () => {
    loginWithProvider('google-oauth2');
});
document.getElementById('btn-login-figma')?.addEventListener('click', () => {
    loginWithProvider('figma');
});

// Logout functionality
document.getElementById('btn-logout')?.addEventListener('click', () => {
    auth0Client.logout({ returnTo: window.location.origin });
});


