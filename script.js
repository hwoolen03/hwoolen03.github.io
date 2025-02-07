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
            cacheLocation: "localstorage"  // Ensures login state persists across redirects
        });
        console.log("Auth0 client configured:", auth0Client);
    };

    const loginWithProvider = async (connection) => {
        console.log(`${connection} login button clicked`);
        await auth0Client.loginWithRedirect({
            redirect_uri: redirectUri,
            connection: connection
        });
    };

    const handleAuthCallback = async () => {
        console.log("Handling auth callback...");
        try {
            await auth0Client.handleRedirectCallback();  // Auth0 will check state automatically
            console.log("Auth callback handled successfully");
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

