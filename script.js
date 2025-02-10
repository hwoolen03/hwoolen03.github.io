document.addEventListener('DOMContentLoaded', async () => {
    console.log("✅ DOMContentLoaded event fired");

    let auth0Client = null;
    const redirectUri = "https://hwoolen03.github.io/indexsignedin.html";

    // Add retries for waiting for the Auth0 SDK
    let retries = 10;
    const checkAuth0Client = () => {
        if (window.createAuth0Client) {
            return true;
        }
        if (retries > 0) {
            console.log(`⏳ Waiting for Auth0 script... Retries left: ${retries}`);
            retries--;
            setTimeout(checkAuth0Client, 1000);
        } else {
            console.error("⚠️ Auth0 SDK is STILL undefined after retries. Attempting manual load...");
            loadAuth0Script();
        }
        return false;
    };

    // Function to load Auth0 SDK manually
    const loadAuth0Script = () => {
        console.log("🔹 Manually loading Auth0 script...");
        const script = document.createElement("script");
        script.src = "https://cdn.auth0.com/js/auth0-spa-js/2.0/auth0-spa-js.production.js";
        script.onload = () => {
            console.log("✅ Auth0 SDK manually loaded.");
            configureClient();
        };
        script.onerror = () => {
            console.error("⚠️ Error loading Auth0 script.");
        };
        document.head.appendChild(script);
    };

    // Step 1: Configure Auth0 Client
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

            // Log to confirm client is initialized
            console.log("✅ Auth0 client configured:", auth0Client);
        } catch (error) {
            console.error("⚠️ Error configuring Auth0 client:", error);
        }
    };

    // Step 2: Login with a Provider
    const loginWithProvider = async (connection) => {
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
            // Re-enable button on error
            if (loginButton) loginButton.disabled = false;
        } finally {
            // Ensure button is re-enabled after attempt
            if (loginButton) loginButton.disabled = false;
        }
    };

    // Step 3: Handle Authentication Callback
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

            await updateUI(); // Call to update UI after successful callback
        } catch (error) {
            console.error("⚠️ Error handling redirect callback:", error);
            if (error.message.includes("Invalid authorization code")) {
                // Handle the error gracefully, potentially prompting a login again
                await auth0Client.loginWithRedirect(); // Re-attempt login
            }
        }
    };

    // Step 4: Update UI Based on Authentication State
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

        // Toggle button visibility
        btnLogout.style.display = isAuthenticated ? "block" : "none";
        btnLoginGitHub.style.display = isAuthenticated ? "none" : "block";
        btnLoginGoogle.style.display = isAuthenticated ? "none" : "block";
        btnLoginFigma.style.display = isAuthenticated ? "none" : "block";

        // Redirect only if authenticated and not already on the target page
        if (isAuthenticated) {
            const currentPath = window.location.pathname;
            const targetPath = new URL(redirectUri).pathname;
            if (currentPath !== targetPath) {
                console.log("✅ Redirecting to signed-in page...");
                window.location.href = redirectUri;
            }
        }
    };

    // Step 5: Initialize and Handle Auth Flow
    if (!checkAuth0Client()) {
        loadAuth0Script(); // If not found, load manually
    }

    // ✅ Wait for Auth0 SDK to load and initialize
    await configureClient();
    await handleAuthCallback(); // Handle callback if present
    await updateUI(); // Update UI and conditionally redirect

    // ✅ Step 6: Add Event Listeners
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

    // ✅ Optional: Add logout functionality
    document.getElementById('btn-logout')?.addEventListener('click', () => {
        console.log("🔹 Logging out...");
        auth0Client.logout({ returnTo: window.location.origin });
    });
});


