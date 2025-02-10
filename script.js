// ✅ Function to manually load the Auth0 SDK if it fails to load
const loadAuth0SDK = async () => {
    return new Promise((resolve, reject) => {
        console.log("🔹 Manually loading Auth0 SDK...");
        const script = document.createElement("script");
        script.src = "https://cdn.auth0.com/js/auth0-spa-js/2.0/auth0-spa-js.production.js";
        script.async = true;
        script.onload = () => {
            console.log("✅ Auth0 SDK manually loaded.");
            resolve();
        };
        script.onerror = () => {
            console.error("⚠️ Failed to load Auth0 SDK.");
            reject();
        };
        document.head.appendChild(script);
    });
};

// ✅ Main Authentication Logic
document.addEventListener("DOMContentLoaded", async () => {
    console.log("✅ DOMContentLoaded event fired");

    // ✅ Ensure the Auth0 SDK is loaded
    let retries = 10; // Retry up to 10 times
    while (typeof createAuth0Client === "undefined" && retries > 0) {
        console.warn(`⏳ Waiting for Auth0 SDK... Retries left: ${retries}`);
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
        retries--;
    }

    // ✅ If SDK is still missing, try loading it manually
    if (typeof createAuth0Client === "undefined") {
        console.error("⚠️ Auth0 SDK is STILL undefined after retries. Attempting manual load...");
        await loadAuth0SDK();

        // Wait again to check if manual loading worked
        await new Promise(resolve => setTimeout(resolve, 500));

        if (typeof createAuth0Client === "undefined") {
            console.error("❌ Auth0 SDK is STILL NOT available after manual load. Exiting script.");
            return;
        }
    }

    console.log("✅ Auth0 SDK is now available.");

    let auth0Client = null;
    const redirectUri = "https://hwoolen03.github.io/indexsignedin.html";

    // ✅ Step 1: Configure Auth0 Client
    const configureClient = async () => {
        console.log("🔹 Configuring Auth0 client...");
        try {
            auth0Client = await createAuth0Client({
                domain: "dev-h4hncqco2n4yrt6z.us.auth0.com",
                client_id: "eUlv5NFe6rjQbLztvS8MsikdIlznueaU",
                redirect_uri: redirectUri,
                cacheLocation: "localstorage",
                useRefreshTokens: true
            });
            console.log("✅ Auth0 client configured:", auth0Client);
        } catch (error) {
            console.error("⚠️ Error configuring Auth0 client:", error);
        }
    };

    // ✅ Step 2: Handle Authentication Callback
    const handleAuthCallback = async () => {
        if (!auth0Client) {
            console.warn("⚠️ Auth0 client is not initialized.");
            return;
        }

        console.log("🔹 Checking for Auth0 callback query parameters...");

        const query = new URLSearchParams(window.location.search);
        console.log("🔹 Full query string:", query.toString());

        if (!query.has("code")) {
            console.warn("⚠️ No authentication parameters found.");
            return;
        }

        try {
            console.log("🔹 Handling Auth0 redirect callback...");
            await auth0Client.handleRedirectCallback();
            console.log("✅ Auth callback handled successfully!");

            // Remove query parameters without redirecting
            window.history.replaceState({}, document.title, window.location.pathname);

            await updateUI();
        } catch (error) {
            console.error("⚠️ Error handling redirect callback:", error);
            if (error.message.includes("Invalid authorization code")) {
                await auth0Client.loginWithRedirect();
            }
        }
    };

    // ✅ Step 3: Update UI Based on Authentication State
    const updateUI = async () => {
        if (!auth0Client) {
            console.warn("⚠️ Auth0 client is not initialized.");
            return;
        }

        console.log("🔹 Updating UI...");

        const isAuthenticated = await auth0Client.isAuthenticated();
        console.log("✅ User authenticated:", isAuthenticated);

        const btnLogout = document.getElementById("btn-logout");
        const btnLoginGitHub = document.getElementById("btn-login-github");
        const btnLoginGoogle = document.getElementById("btn-login-google");
        const btnLoginFigma = document.getElementById("btn-login-figma");

        if (!btnLogout || !btnLoginGitHub || !btnLoginGoogle || !btnLoginFigma) {
            console.error("⚠️ One or more elements not found in the DOM");
            return;
        }

        btnLogout.style.display = isAuthenticated ? "block" : "none";
        btnLoginGitHub.style.display = isAuthenticated ? "none" : "block";
        btnLoginGoogle.style.display = isAuthenticated ? "none" : "block";
        btnLoginFigma.style.display = isAuthenticated ? "none" : "block";

        if (isAuthenticated) {
            const currentPath = window.location.pathname;
            const targetPath = new URL(redirectUri).pathname;
            if (currentPath !== targetPath) {
                console.log("✅ Redirecting to signed-in page...");
                window.location.href = redirectUri;
            }
        }
    };

    // ✅ Step 4: Initialize and Handle Auth Flow
    await configureClient();
    await handleAuthCallback();
    await updateUI();

    // ✅ Step 5: Add Event Listeners
    document.getElementById("btn-login-github").addEventListener("click", () => loginWithProvider("github"));
    document.getElementById("btn-login-google").addEventListener("click", () => loginWithProvider("google-oauth2"));
    document.getElementById("btn-login-figma").addEventListener("click", () => loginWithProvider("figma"));

    document.getElementById("btn-logout")?.addEventListener("click", () => {
        auth0Client.logout({ returnTo: window.location.origin });
    });
});

