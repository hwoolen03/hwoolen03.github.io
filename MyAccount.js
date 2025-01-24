document.addEventListener('DOMContentLoaded', async () => {
    const auth0 = await createAuth0Client({
        domain: "dev-h4hncqco2n4yrt6z.us.auth0.com",
        client_id: "eUlv5NFe6rjQbLztvS8MsikdIlznueaU"
    });

    const isAuthenticated = await auth0.isAuthenticated();

    if (isAuthenticated) {
        const user = await auth0.getUser();
        document.getElementById('profile-pic').src = user.picture || 'default-profile-pic.jpg';
        document.getElementById('username').textContent = user.name || 'Username';
        document.getElementById('email').textContent = user.email || 'Email';
    } else {
        // Redirect to login page if not authenticated
        window.location.href = 'login.html';
    }
});
