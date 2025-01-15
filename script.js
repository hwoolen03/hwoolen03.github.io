document.addEventListener('DOMContentLoaded', async () => {
    let auth0Client = null;

    const configureClient = async () => {
        auth0Client = await createAuth0Client({
            domain: "dev-h4hncqco2n4yrt6z.us.auth0.com",
            client_id: "eUlv5NFe6rjQbLztvS8MsikdIlznueaU",
          redirect_uri: "https://dev-h4hncqco2n4yrt6z.us.auth0.com/login/callback"
        });
    };

    const loginWithGitHub = async () => {
        await auth0Client.loginWithRedirect({
            redirect_uri: "https://dev-h4hncqco2n4yrt6z.us.auth0.com/login/callback" + "/callback",
            connection: 'github'
        });
    };

    const handleAuthCallback = async () => {
        const isAuthenticated = await auth0Client.isAuthenticated();
        if (isAuthenticated) {
            const user = await auth0Client.getUser();
            console.log('User info:', user);
            window.location.href = "indexsignedin.html";
        } else {
            const query = window.location.search;
            if (query.includes("code=") && query.includes("state=")) {
                await auth0Client.handleRedirectCallback();
                window.location.href = "indexsignedin.html";
            }
        }
    };

    // NEW
    const updateUI = async () => {
        const isAuthenticated = await auth0Client.isAuthenticated();

        document.getElementById("btn-logout").disabled = !isAuthenticated;
        document.getElementById("btn-login").disabled = isAuthenticated;
    };

    document.getElementById('githubSignInBtn').addEventListener('click', loginWithGitHub);

    await configureClient();
    handleAuthCallback();

    // NEW
    window.onload = async () => {
        await configureClient();
        updateUI();
    };
});
