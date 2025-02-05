document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOMContentLoaded event fired");
    let auth0Client = null;
    const redirectUri = "https://hwoolen03.github.io/indexsignedin.html";

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

    const loginWithGoogle = async () => {
        console.log("Google login button clicked");
        await auth0Client.loginWithRedirect({
            redirect_uri: redirectUri,
            connection: 'google-oauth2'
        });
    };

    const loginWithFigma = async () => {
        console.log("Figma login button clicked");
        await auth0Client.loginWithRedirect({
            redirect_uri: redirectUri,
            connection: 'figma'
        });
    };

    const handleAuthCallback = async () => {
        const query = window.location.search;
        console.log("Handling auth callback with query:", query);
        if (query.includes("code=") && query.includes("state=")) {
            try {
                const result = await auth0Client.handleRedirectCallback();
                console.log("Auth callback result:", result);
                window.history.replaceState({}, document.title, "/");
                window.location.href = "indexsignedin.html";
            } catch (error) {
                console.error("Error handling redirect callback:", error);
            }
        }
    };

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
            return; // Prevent further errors
        }

        btnLogout.style.display = isAuthenticated ? "block" : "none";
        btnLoginGitHub.style.display = isAuthenticated ? "none" : "block";
        btnLoginGoogle.style.display = isAuthenticated ? "none" : "block";
        btnLoginFigma.style.display = isAuthenticated ? "none" : "block";

        if (isAuthenticated) {
            console.log("User is authenticated, redirecting to indexsignedin.html");
            window.location.href = "https://hwoolen03.github.io/indexsignedin.html";
        }
    };

    document.getElementById('btn-login-github').addEventListener('click', loginWithGitHub);
    console.log("Added event listener to GitHub login button");

    document.getElementById('btn-login-google').addEventListener('click', loginWithGoogle);
    console.log("Added event listener to Google login button");

    document.getElementById('btn-login-figma').addEventListener('click', loginWithFigma);
    console.log("Added event listener to Figma login button");

    await configureClient();
    await handleAuthCallback();
    updateUI();
});

