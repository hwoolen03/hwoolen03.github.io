document.addEventListener('DOMContentLoaded', async () => {
    console.log("✅ DOMContentLoaded event fired");

    let auth0Client = null;
    let retries = 10;

    // ✅ Wait for Auth0 SDK to be defined
    const waitForAuth0 = async () => {
        while (typeof createAuth0Client === "undefined" && retries > 0) {
            console.warn(`⏳ Waiting for Auth0 SDK... Retries left: ${retries}`);
            await new Promise(resolve => setTimeout(resolve, 500));
            retries--;
        }

        if (typeof createAuth0Client === "undefined") {
            console.error("❌ Auth0 SDK is STILL NOT available. Exiting script.");
            return;
        }

        console.log("✅ Auth0 SDK is available. Proceeding with configuration.");

        // ✅ Configure Auth0 Client
        try {
            auth0Client = await createAuth0Client({
                domain: "dev-h4hncqco2n4yrt6z.us.auth0.com",
                client_id: "eUlv5NFe6rjQbLztvS8MsikdIlznueaU",
                redirect_uri: window.location.origin,
                cacheLocation: "localstorage",
                useRefreshTokens: true
            });

            console.log("✅ Auth0 client configured:", auth0Client);
            await handleAuthCallback();
            await updateUI();
        } catch (error) {
            console.error("⚠️ Error configuring Auth0 client:", error);
        }
    };

    // ✅ Handle Authentication Callback
    const handleAuthCallback = async () => {
        if (!auth0Client) return;
        try {
            await auth0Client.handleRedirectCallback();
            console.log("✅ Auth callback handled successfully!");
            window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
            console.error("⚠️ Error handling redirect callback:", error);
        }
    };

    // ✅ Update UI Based on Authentication
    const updateUI = async () => {
        if (!auth0Client) return;
        const isAuthenticated = await auth0Client.isAuthenticated();
        console.log("✅ User authenticated:", isAuthenticated);
        document.getElementById("btn-logout").style.display = isAuthenticated ? "block" : "none";
        document.getElementById("btn-login-github").style.display = isAuthenticated ? "none" : "block";
        document.getElementById("btn-login-google").style.display = isAuthenticated ? "none" : "block";
        document.getElementById("btn-login-figma").style.display = isAuthenticated ? "none" : "block";
    };

    await waitForAuth0();
});

