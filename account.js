let auth0Client = null;

const configureClient = async () => {
    auth0Client = await createAuth0Client({
        domain: "dev-h4hncqco2n4yrt6z.us.auth0.com",
        client_id: "eUlv5NFe6rjQbLztvS8MsikdIlznueaU",
        redirect_uri: window.location.origin
    });
};

const signOut = async () => {
    await auth0Client.logout({
        returnTo: window.location.origin
    });
    window.location.href = "index.html";
};

const handleAuthCallback = async () => {
    const isAuthenticated = await auth0Client.isAuthenticated();
    if (isAuthenticated) {
        const user = await auth0Client.getUser();
        const authMethod = user.sub.split('|')[0];
        document.getElementById('signOutBtn').textContent = `Hi ${user.name}, you are signed in with ${authMethod}. Would you like to sign out?`;
    } else {
        const query = window.location.search;
        if (query.includes("code=") && query.includes("state=")) {
            await auth0Client.handleRedirectCallback();
            window.location.href = "indexsignedin.html";
        }
    }
};

const signOutBtn = document.getElementById('signOutBtn');
signOutBtn.addEventListener('click', signOut);

window.onload = async () => {
    await configureClient();
    handleAuthCallback();
};