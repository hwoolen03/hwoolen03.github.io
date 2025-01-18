// Handle authentication callback
const handleAuthCallback = async () => {
    try {
        if (auth0Client) {
            const isAuthenticated = await auth0Client.isAuthenticated();
            if (isAuthenticated) {
                const user = await auth0Client.getUser();
                const userName = user.name;
                const welcomeMessage = `Welcome to the Power of Atlas ${userName}`;

                // Create the h2 element
                const h2Element = document.createElement('h2');
                h2Element.textContent = welcomeMessage;
                h2Element.style.textAlign = 'center';

                // Insert the h2 element above the "Find My Holiday" button
                const findMyHolidayButton = document.getElementById('findMyHolidayButton');
                findMyHolidayButton.parentNode.insertBefore(h2Element, findMyHolidayButton);

                console.log("User is authenticated:", user);
            } else {
                const query = window.location.search;
                if (query.includes("code=") && query.includes("state=")) {
                    await auth0Client.handleRedirectCallback();
                    window.location.href = "indexsignedin.html";
                    console.log("Handled redirect callback");
                }
            }
        } else {
            console.error("Auth0 client is not initialized");
        }
    } catch (error) {
        console.error("Error handling authentication callback:", error);
    }
};
