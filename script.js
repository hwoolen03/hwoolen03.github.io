document.addEventListener('DOMContentLoaded', async () => {
    console.log("✅ DOMContentLoaded event fired");

    // Ensure Auth0 SDK is loaded before continuing
    if (typeof createAuth0Client === 'undefined') {
        console.error("⚠️ Auth0 SDK is not loaded properly.");
        return;
    }

    let auth0Client = null;
    const redirectUri = "https://hwoolen03.github.io/indexsignedin.html";

    // Configure Auth0 Client
    const configureClient = async () => {
        console.log("🔹 Configuring Auth0 client...");
        try {
            auth0Client = await createAuth0Client({
                domain: "dev-h4hncqco2n4yrt6z.us.auth0.com", // Your Auth0 domain
                client_id: "eUlv5NFe6rjQbLztvS8MsikdIlznueaU", // Your Auth0 client ID
                redirect_uri: redirectUri,
                cacheLocation: "localstorage",
                useRefreshTokens: true
            });
            console.log("✅ Auth0 client configured:", auth0Client);
            setLoginEventListeners(); // Set up event listeners after client is initialized
        } catch (error) {
            console.error("⚠️ Error configuring Auth0 client:", error);
        }
    };

    // Login with provider (GitHub, Google, Figma)
    const loginWithProvider = async (connection) => {
        if (!auth0Client) {
            console.error("⚠️ Auth0 client is not available.");
            return;
        }

        console.log(`🔹 Login button clicked for ${connection}`);

        const loginButton = document.getElementById(`btn-login-${connection}`);
        if (loginButton) {
            loginButton.disabled = true;
        }

        try {
            console.log("🔹 Redirecting to Auth0 login...");
            await auth0Client.loginWithRedirect({
                redirect_uri: redirectUri,
                connection: connection
            });
            console.log("✅ Login initiated, redirecting...");
        } catch (error) {
            console.error("⚠️ Error during loginWithRedirect:", error);
            if (loginButton) loginButton.disabled = false;
        }
    };

    // Set event listeners for login buttons after Auth0 client is initialized
    const setLoginEventListeners = () => {
        document.getElementById('btn-login-github')?.addEventListener('click', () => {
            console.log("🔹 GitHub login button clicked");
            loginWithProvider('github');
        });

        document.getElementById('btn-login-google')?.addEventListener('click', () => {
            console.log("🔹 Google login button clicked");
            loginWithProvider('google-oauth2');
        });

        document.getElementById('btn-login-figma')?.addEventListener('click', () => {
            console.log("🔹 Figma login button clicked");
            loginWithProvider('figma');
        });
    };

    // Handle the Auth0 callback after redirect
    const handleAuthCallback = async () => {
        if (!auth0Client) {
            console.warn("⚠️ Auth0 client is not initialized.");
            return;
        }

        console.log("🔹 Checking for Auth0 callback query parameters...");
        const query = new URLSearchParams(window.location.search);
        console.log("🔹 Full query string:", query.toString());

        if (!query.has("code")) {
            console.warn("⚠️ No authentication parameters found.");
            return;
        }

        try {
            console.log("🔹 Handling Auth0 redirect callback...");
            await auth0Client.handleRedirectCallback();
            console.log("✅ Auth callback handled successfully!");

            // Remove query parameters without redirecting
            window.history.replaceState({}, document.title, window.location.pathname);

            await updateUI(); // Update the UI after successful authentication
        } catch (error) {
            console.error("⚠️ Error handling redirect callback:", error);
            if (error.message.includes("Invalid authorization code")) {
                await auth0Client.loginWithRedirect(); // Re-attempt login if needed
            }
        }
    };

    // Update the UI based on the authentication status
    const updateUI = async () => {
        if (!auth0Client) {
            console.warn("⚠️ Auth0 client is not initialized.");
            return;
        }

        console.log("🔹 Updating UI...");
        const isAuthenticated = await auth0Client.isAuthenticated();
        console.log("✅ User authenticated:", isAuthenticated);

        const btnLogout = document.getElementById("btn-logout");
        const btnLoginGitHub = document.getElementById("btn-login-github");
        const btnLoginGoogle = document.getElementById("btn-login-google");
        const btnLoginFigma = document.getElementById("btn-login-figma");

        if (!btnLogout || !btnLoginGitHub || !btnLoginGoogle || !btnLoginFigma) {
            console.error("⚠️ One or more elements not found in the DOM");
            return;
        }

        btnLogout.style.display = isAuthenticated ? "block" : "none";
        btnLoginGitHub.style.display = isAuthenticated ? "none" : "block
::contentReference[oaicite:0]{index=0}
 




