document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOMContentLoaded event fired");

    let auth0Client = null;
    const redirectUri = "https://hwoolen03.github.io/indexsignedin.html";

    const configureClient = async () => {
        console.log("Configuring Auth0 client...");
        auth0Client = await createAuth0Client({
            domain: "dev-h4hncqco2n4yrt6z.us.auth0.com",
            client_id: "eUlv5NFe6rjQbLztvS8MsikdIlznueaU",
            redirect_uri: redirectUri,
            cacheLocation: 'localstorage'  // Persist login state
        });
        console.log("Auth0 client configured:", auth0Client);
    };

    const loginWithProvider = async (connection) => {
        const stateValue = Math.random().toString(36).substring(2);
        console.log("Generated state:", stateValue);
        localStorage.setItem("auth_state", stateValue);

        await auth0Client.loginWithRedirect({
            redirect_uri: redirectUri,
            connection: connection,
            state: stateValue
        });
    };

    const handleAuthCallback = async () => {
        const query = new URLSearchParams(window.location.search);
        console.log("Handling auth callback with query:", query.toString());

        const storedState = localStorage.getItem("auth_state");
        const receivedState = query.get("state");

        console.log("Stored state:", storedState);
        console.log("Received state:", receivedState);

        if (storedState !== receivedState) {
            console.error("State mismatch detected! Possible CSRF or storage issue.");
            return;
        }

        try {
            const result = await auth0Client.handleRedirectCallback();
            console.log("Auth callback result:", result);
            window.history.replaceState({}, document.title, "/");
            window.location.href = "indexsignedin.html";
        } catch (error) {
            console.error("Error handling redirect callback:", error);
        }
    };

    const updateUI = async () => {
        console.log("Updating UI...");
        const isAuthenticated = await auth0Client.isAuthenticated();
        console.log("Update UI - Is authenticated:", isAuthenticated);

        document.getElementById("btn-logout").style.display = isAuthenticated ? "block" : "none";
        document.getElementById("btn-login-github").style.display = isAuthenticated ? "none" : "block";
        document.getElementById("btn-login-google").style.display = isAuthenticated ? "none" : "block";
        document.getElementById("btn-login-figma").style.display = isAuthenticated ? "none" : "block";

        if (isAuthenticated) {
            console.log("User is authenticated, redirecting to indexsignedin.html");
            window.location.href = "https://hwoolen03.github.io/indexsignedin.html";
        }
    };

    document.getElementById('btn-login-github').addEventListener('click', () => loginWithProvider('github'));
    console.log("Added event listener to GitHub login button");

    document.getElementById('btn-login-google').addEventListener('click', () => loginWithProvider('google-oauth2'));
    console.log("Added event listener to Google login button");

    document.getElementById('btn-login-figma').addEventListener('click', () => loginWithProvider('figma'));
    console.log("Added event listener to Figma login button");

    await configureClient();
    await handleAuthCallback();
    await updateUI();
});

