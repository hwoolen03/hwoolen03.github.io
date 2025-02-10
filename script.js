document.addEventListener('DOMContentLoaded', async () => {
    console.log("✅ DOMContentLoaded event fired");

    let auth0Client = null;

    // ✅ Ensure Auth0 SDK is available before continuing
    const waitForAuth0 = async () => {
        let retries = 10;
        while (typeof createAuth0Client === "undefined" && retries > 0) {
            console.warn(`⏳ Waiting for Auth0 SDK... Retries left: ${retries}`);
            await new Promise(resolve => setTimeout(resolve, 500));
            retries--;
        }
        if (typeof createAuth0Client === "undefined") {
            console.error("❌ Auth0 SDK is STILL NOT available. Exiting script.");
            return;
        }

        console.log("✅ Auth0 SDK is available. Proceeding...");
        return true;
    };

    // ✅ Initialize Auth0 Client
    const configureClient = async () => {
        try {
            auth0Client = await createAuth0Client({
                domain: "dev-h4hncqco2n4yrt6z.us.auth0.com",
                client_id: "eUlv5NFe6rjQbLztvS8MsikdIlznueaU",
                redirect_uri: window.location.origin,
                cacheLocation: "localstorage",
                useRefreshTokens: true
            });

            console.log("✅ Auth0 client configured:", auth0Client);
            await updateUI(); // Update UI after initialization
        } catch (error) {
            console.error("⚠️ Error configuring Auth0 client:", error);
        }
    };

    // ✅ Handle Login with Provider
    const loginWithProvider = async (connection) => {
        console.log(`🔹 Login button clicked for ${connection}`);
        if (!auth0Client) {
            console.error("⚠️ Auth0 client is NOT initialized yet.");
            return;
        }

        try {
            console.log("🔹 Redirecting to Auth0 login...");
            await auth0Client.loginWithRedirect({
                redirect_uri: window.location.origin,
                connection: connection
            });
            console.log("✅ Login initiated, redirecting...");
        } catch (error) {
            console.error("⚠️ Error during login:", error);
        }
    };

    // ✅ Handle Auth0 Callback after Redirect
    const handleAuthCallback = async () => {
        if (!auth0Client) {
            console.warn("⚠️ Auth0 client is not initialized.");
            return;
        }

        console.log("🔹 Checking for Auth0 callback query parameters...");

        const query = new URLSearchParams(window.location.search);
        if (!query.has("code")) {
            console.warn("⚠️ No authentication parameters found.");
            return;
        }

        try {
            console.log("🔹 Handling Auth0 redirect callback...");
            await auth0Client.handleRedirectCallback();
            console.log("✅ Auth callback handled successfully!");

            // Remove query parameters from URL
            window.history.replaceState({}, document.title, window.location.pathname);

            await updateUI(); // Refresh UI after successful login
        } catch (error) {
            console.error("⚠️ Error handling redirect callback:", error);
        }
    };

    // ✅ Update UI Based on Authentication State
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

        if (isAuthenticated) {
            console.log("✅ User is logged in");
        } else {
            console.log("❌ User is NOT logged in");
        }
    };

    // ✅ Wait for Auth0 SDK and Initialize
    const sdkLoaded = await waitForAuth0();
    if (sdkLoaded) {
        await configureClient();
        await handleAuthCallback();
    }

    // ✅ Attach event listeners AFTER Auth0 is initialized
    document.getElementById('btn-login-github').addEventListener('click', () => loginWithProvider('github'));
    document.getElementById('btn-login-google').addEventListener('click', () => loginWithProvider('google-oauth2'));
    document.getElementById('btn-login-figma').addEventListener('click', () => loginWithProvider('figma'));

    document.getElementById('btn-logout').addEventListener('click', () => {
        if (auth0Client) {
            auth0Client.logout({ returnTo: window.location.origin });
            console.log("✅ User logged out");
        }
    });
});

