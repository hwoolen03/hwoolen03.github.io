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
            cacheLocation: "localstorage",  // Ensures login state persists across redirects
            useRefreshTokens: true
        });
        console.log("Auth0 client configured:", auth0Client);
    };

    // Handle login with different providers
    const loginWithProvider = async (connection) => {
        console.log(`${connection} login button clicked`);

        // Generate and store a unique state value
        const state = Math.random().toString(36).substring(7);

        console.log("Attempting to store state before redirect:", state);
        sessionStorage.setItem("auth_state", state);  // Changed from localStorage to sessionStorage

        console.log("Stored state before redirect:", sessionStorage.getItem("auth_state")); // Debugging step

        // Check if button exists before trying to disable it
        const loginButton = document.getElementById(`btn-login-${connection}`);
        if (loginButton) {
            loginButton.disabled = true;  // Disable the button to prevent multiple clicks
        }

        // Proceed with redirect
        await auth0Client.loginWithRedirect({
            redirect_uri: redirectUri,
            connection: connection,
            state: state
        });
    };

    // Handle authentication callback
    const handleAuthCallback = async () => {
        // Only handle the callback if there are query parameters (i.e., state and code)
        const query = new URLSearchParams(window.location.search);
        const receivedState = query.get("state");
        const storedState = sessionStorage.getItem("auth_state");  // Retrieve the state from sessionStorage

        if (!receivedState) {
            console.error("No state received in the URL!");
            return;
        }

        console.log("Received state from URL:", receivedState);
        console.log("Stored state from sessionStorage:", storedState);

        if (!storedState) {
            console.error("Stored state is null! The state was lost.");
            return;
        }

        if (receivedState !== storedState) {
            console.error("State mismatch detected! Possible CSRF or storage issue.");
            return;
        }

        // Proceed with handling the callback
        try {
            await auth0Client.handleRedirectCallback();
            console.log("Auth callback handled successfully");

            // Clear stored state and URL parameters
            sessionStorage.removeItem("auth_state");
            window.history.replaceState({}, document.title, window.location.pathname);  // Remove URL query params

            // Redirect to the signed-in page
            window.location.href = redirectUri;
        } catch (error) {
            console.error("Error handling redirect callback:", error);
        }
    };

    // Update UI based on authentication state
    const updateUI = async () => {
        console.log("Updating UI...");
        
        const isAuthenticated = await auth0Client.isAuthenticated();
        console.log("Update UI - Is authenticated:", isAuthenticated);

        const btnLogout = document.getElementById("btn-logout");
        const btnLoginGitHub = document.getElementById("btn-login-github");
        const btnLoginGoogle = document.getElementById("btn-login-google");
        const btnLoginFigma = document.getElementById("btn-login-figma");

        if (!btnLogout || !btnLoginGitHub || !btnLoginGoogle || !btnLoginFigma) {
            console.error("One or more elements not found in the DOM");
            return;
        }

        btnLogout.style.display = isAuthenticated ? "block" : "none";
        btnLoginGitHub.style.display = isAuthenticated ? "none" : "block";
        btnLoginGoogle.style.display = isAuthenticated ? "none" : "block";
        btnLoginFigma.style.display = isAuthenticated ? "none" : "block";

        if (isAuthenticated) {
            console.log("User is authenticated, redirecting to indexsignedin.html");
            window.location.href = redirectUri;  // Ensure correct redirect
        }
    };

    // Initialize Auth0 client
    await configureClient();

    // Only handle the callback if needed (avoid unnecessary redirects)
    await handleAuthCallback();

    // Update UI after authentication check
    await updateUI();

    // Add event listeners for login buttons
    document.getElementById('btn-login-github').addEventListener('click', () => loginWithProvider('github'));
    console.log("Added event listener to GitHub login button");

    document.getElementById('btn-login-google').addEventListener('click', () => loginWithProvider('google-oauth2'));
    console.log("Added event listener to Google login button");

    document.getElementById('btn-login-figma').addEventListener('click', () => loginWithProvider('figma'));
    console.log("Added event listener to Figma login button");
});

