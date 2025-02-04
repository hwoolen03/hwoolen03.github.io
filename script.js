document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOMContentLoaded event fired");
    let auth0Client = null;
    const redirectUri = `${window.location.origin}/indexsignedin.html`; // Ensure correct syntax for redirect URI

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
        document.getElementById("btn-login-figma").style.display = isAuthenticated ? "none" : "block";

        if (isAuthenticated) {
            window.location.href = "indexsignedin.html";
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

    // Smooth video loop
    const video = document.getElementById('background-video');
    video.addEventListener('ended', function () {
        setTimeout(() => {
            video.currentTime = 0;
            video.play();
        }, 100); // Adjust the timeout as needed for a smoother experience
    });
});
