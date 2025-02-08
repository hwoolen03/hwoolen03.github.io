document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOMContentLoaded event fired");

    let auth0Client = null;
    const redirectUri = "https://hwoolen03.github.io/indexsignedin.html";

    // Configure Auth0 client
    const configureClient = async () => {
        console.log("Configuring Auth0 client...");
        auth0Client = await createAuth0Client({
            domain: "dev-h4hncqco2n4yrt6z.us.auth0.com",
            client_id: "eUlv5NFe6rjQbLztvS8MsikdIlznueaU",
            redirect_uri: redirectUri,
            cacheLocation: "localstorage",
            useRefreshTokens: true
        });
        console.log("Auth0 client configured:", auth0Client);
    };

    // Handle login with different providers
    const loginWithProvider = async (connection) => {
        console.log(`${connection} login button clicked`);

        // Generate and store a unique state value
        const state = crypto.randomUUID(); // More secure than Math.random()
        localStorage.setItem("auth_state", state);

        console.log("Stored state in localStorage:", state);

        const loginButton = document.getElementById(`btn-login-${connection}`);
        if (loginButton) {
            loginButton.disabled = true;
        }

        console.log("Redirecting with state:", state);

        // Redirect user to Auth0 login
        await auth0Client.loginWithRedirect({
            redirect_uri: redirectUri,
            connection: connection,
            state: state
        });
    };

    // Handle authentication callback after redirect
    const handleAuthCallback = async () => {
        const query = new URLSearchParams(window.location.search);
        
        // ✅ Exit early if there are no auth query parameters
        if (!query.has("code") || !query.has("state")) {
            console.log("🔹 No auth query parameters found, skipping redirect callback.");
            return;
        }

        try {
            console.log("Handling redirect callback...");
            
            // ✅ Process the redirect BEFORE checking state
            await auth0Client.handleRedirectCallback();
            
            const receivedState = query.get("state");
            const storedState = localStorage.getItem("auth_state");

            console.log("Current URL:", window.location.href);
            console.log("Received state:", receivedState);
            console.log("Stored state:", storedState);

            if (!receivedState) {
                console.error("❌ No state received in the URL!");
                return;
            }

            if (!storedState) {
                console.error("❌ Stored state is missing! It may have been lost.");
                return;
            }

            if (receivedState !== storedState) {
                console.error("❌ State mismatch detected! Possible CSRF attack.");
                return;
            }

            console.log("✅ State validated successfully!");

            // ✅ Clear stored state and remove query params from URL
            localStorage.removeItem("auth_state");
            window.history.replaceState({}, document.title, window.location.pathname);

            // ✅ Redirect to signed-in page
            window.location.href = redirectUri;
        } catch (error) {
            console.error("⚠️ Error handling redirect callback:", error);
        }
    };

    // Update UI based on authentication state
    const updateUI = async () => {
        console.log("Updating UI...");
        
        const isAuthenticated = await auth0Client.isAuthenticated();
        console.log("User authenticated:", isAuthenticated);

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

    // Initialize Auth0 client
    await configureClient();

    // Handle authentication callback if needed
    await handleAuthCallback();

    // Update UI after authentication check
    await updateUI();

    // Add event listeners for login buttons
    document.getElementById('btn-login-github').addEventListener('click', () => loginWithProvider('github'));
    console.log("✅ Added event listener to GitHub login button");

    document.getElementById('btn-login-google').addEventListener('click', () => loginWithProvider('google-oauth2'));
    console.log("✅ Added event listener to Google login button");

    document.getElementById('btn-login-figma').addEventListener('click', () => loginWithProvider('figma'));
    console.log("✅ Added event listener to Figma login button");
});

