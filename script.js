document.addEventListener('DOMContentLoaded', async () => {
    let auth0Client = null;
    const  redirectUri = "https://hwoolen03.github.io/callback";

    const configureClient = async () => {
        auth0Client = await createAuth0Client({
            domain: "dev-h4hncqco2n4yrt6z.us.auth0.com",
            client_id: "eUlv5NFe6rjQbLztvS8MsikdIlznueaU",
           redirectUri = "https://hwoolen03.github.io/callback"
        });
        console.log("Auth0 client configured:", auth0Client);
    };

    const loginWithGitHub = async () => {
        console.log("GitHub login button clicked");
        await auth0Client.loginWithRedirect({
         redirectUri = "https://hwoolen03.github.io/callback",
            connection: 'github'
        });
    };

    const handleAuthCallback = async () => {
        const isAuthenticated = await auth0Client.isAuthenticated();
        console.log("Is authenticated:", isAuthenticated);
        if (isAuthenticated) {
            const user = await auth0Client.getUser();
            console.log('User info:', user);
            window.location.href = "indexsignedin.html";
        } else {
            const query = window.location.search;
            console.log("Query string:", query);
            if (query.includes("code=") && query.includes("state=")) {
                await auth0Client.handleRedirectCallback();
                window.location.href = "indexsignedin.html";
            }
        }
    };

    const updateUI = async () => {
        const isAuthenticated = await auth0Client.isAuthenticated();
        console.log("Update UI - Is authenticated:", isAuthenticated);

        document.getElementById("btn-logout").disabled = !isAuthenticated;
        document.getElementById("btn-login").disabled = isAuthenticated;
    };

    document.getElementById('githubSignInBtn').addEventListener('click', loginWithGitHub);

    await configureClient();
    handleAuthCallback();

    window.onload = async () => {
        await configureClient();
        updateUI();
    };
});
