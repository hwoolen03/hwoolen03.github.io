document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOMContentLoaded event fired");
    let auth0Client = null;
    const redirectUri = "https://hwoolen03.github.io/";

    const configureClient = async () => {
        console.log("Configuring Auth0 client...");
        auth0Client = await createAuth0Client({
            domain: "dev-h4hncqco2n4yrt6z.us.auth0.com",
            client_id: "eUlv5NFe6rjQbLztvS8MsikdIlznueaU",
            redirect_uri: redirectUri
        });
        console.log("Auth0 client configured:", auth0Client);
    };

    const loginWithGitHub = async () => {
        console.log("GitHub login button clicked");
        await auth0Client.loginWithRedirect({
            redirect_uri: redirectUri,
            connection: 'github'
        });
    };

    const handleAuthCallback = async () => {
        const query = window.location.search;
        console.log("Handling auth callback with query:", query);
        if (query.includes("code=") && query.includes("state=")) {
            await auth0Client.handleRedirectCallback();
            window.history.replaceState({}, document.title, "/");
            window.location.href = "indexsignedin.html";
        }
    };

    const updateUI = async () => {
        console.log("Updating UI...");
        const isAuthenticated = await auth0Client.isAuthenticated();
        console.log("Update UI - Is authenticated:", isAuthenticated);

        document.getElementById("btn-logout").style.display = isAuthenticated ? "block" : "none";
        document.getElementById("btn-login-github").style.display = isAuthenticated ? "none" : "block";
        document.getElementById("btn-login-google").style.display = isAuthenticated ? "none" : "block";
        document.getElementById("btn-login-facebook").style.display = isAuthenticated ? "none" : "block";

        if (isAuthenticated) {
            window.location.href = "indexsignedin.html";
        }
    };

    document.getElementById('btn-login-github').addEventListener('click', loginWithGitHub);
    console.log("Added event listener to GitHub login button");

    await configureClient();
    await handleAuthCallback();
    updateUI();
});

