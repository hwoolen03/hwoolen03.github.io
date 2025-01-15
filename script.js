document.addEventListener('DOMContentLoaded', async () => {
    let auth0Client = null;
    const redirectUri = "https://hwoolen03.github.io/";

    const configureClient = async () => {
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
        if (query.includes("code=") && query.includes("state=")) {
            await auth0Client.handleRedirectCallback();
            window.history.replaceState({}, document.title, "/");
            window.location.href = "indexsignedin.html";
        }
    };

    const updateUI = async () => {
        const isAuthenticated = await auth0Client.isAuthenticated();
        console.log("Update UI - Is authenticated:", isAuthenticated);

        document.getElementById("btn-logout").disabled = !isAuthenticated;
        document.getElementById("btn-login").disabled = isAuthenticated;

        if (isAuthenticated) {
            window.location.href = "indexsignedin.html";
        }
    };

    document.getElementById('githubSignInBtn').addEventListener('click', loginWithGitHub);

    await configureClient();
    await handleAuthCallback();
    updateUI();
});
