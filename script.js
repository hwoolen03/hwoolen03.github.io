document.addEventListener('DOMContentLoaded', async () => {
    console.log("✅ DOMContentLoaded event fired");

    let auth0Client = null;
    const redirectUri = "https://hwoolen03.github.io/indexsignedin.html";

    // ✅ Step 1: Configure Auth0 Client
    const configureClient = async () => {
        console.log("🔹 Configuring Auth0 client...");
        auth0Client = await createAuth0Client({
            domain: "dev-h4hncqco2n4yrt6z.us.auth0.com",
            client_id: "eUlv5NFe6rjQbLztvS8MsikdIlznueaU",
            redirect_uri: redirectUri,
            cacheLocation: "localstorage",
            useRefreshTokens: true
        });
        console.log("✅ Auth0 client configured:", auth0Client);
    };

    // ✅ Step 2: Login with a Provider
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
        }
    };

    // ✅ Step 3: Handle Authentication Callback
    const handleAuthCallback = async () => {
        console.log("🔹 Checking for Auth0 callback query parameters...");

        const query = new URLSearchParams(window.location.search);
        console.log("🔹 Full query string:", query.toString());  // ✅ Debugging

        if (!query.has("code")) {
            console.warn("⚠️ No authentication parameters found. The redirect might have failed.");
            return;
        }

        try {
            console.log("🔹 Handling Auth0 redirect callback...");
            await auth0Client.handleRedirectCallback();
            console.log("✅ Auth callback handled successfully!");

            // ✅ Remove query parameters from URL WITHOUT refreshing the page
            window.history.replaceState({}, document.title, window.location.pathname);

            // ✅ Redirect to signed-in page
            window.location.href = redirectUri;
        } catch (error) {
            console.error("⚠️ Error handling redirect callback:", error);
        }
    };

    // ✅ Step 4: Update UI Based on Authentication State
    const updateUI = async () => {
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
        btnLoginGitHub.style.display = isAuthenticated ? "none" : "block";
        btnLoginGoogle.style.display = isAuthenticated ? "none" : "block";
        btnLoginFigma.style.display = isAuthenticated ? "none" : "block";

        if (isAuthenticated) {
            console.log("✅ User is authenticated, redirecting to indexsignedin.html");
            window.location.href = redirectUri;
        }
    };

    // ✅ Step 5: Initialize Auth0 Client and Handle Callbacks
    await configureClient();

    // ✅ Handle authentication callback if needed
    await handleAuthCallback();

    // ✅ Update UI after authentication check
    await updateUI();

    // ✅ Step 6: Add Event Listeners for Login Buttons
    document.getElementById('btn-login-github').addEventListener('click', () => loginWithProvider('github'));
    console.log("✅ Added event listener to GitHub login button");

    document.getElementById('btn-login-google').addEventListener('click', () => loginWithProvider('google-oauth2'));
    console.log("✅ Added event listener to Google login button");

    document.getElementById('btn-login-figma').addEventListener('click', () => loginWithProvider('figma'));
    console.log("✅ Added event listener to Figma login button");
});



