let auth0Client = null;

// Initialize and configure Auth0 client
const configureClient = async () => {
    try {
        auth0Client = await createAuth0Client({
            domain: "dev-h4hncqco2n4yrt6z.us.auth0.com",
            client_id: "eUlv5NFe6rjQbLztvS8MsikdIlznueaU",
            redirect_uri: window.location.origin,
        });
        console.log("Auth0 client configured successfully");
    } catch (error) {
        console.error("Error configuring Auth0 client:", error);
    }
};

// Handle user sign-out
const signOut = async () => {
    if (!auth0Client) {
        console.error("Auth0 client is not initialized");
        return;
    }
    try {
        await auth0Client.logout({ returnTo: window.location.origin });
        console.log("User signed out");
        window.location.href = "index.html";
    } catch (error) {
        console.error("Error signing out:", error);
    }
};

// Handle authentication callback
const handleAuthCallback = async () => {
    try {
        const query = window.location.search;
        if (query.includes("code=") && query.includes("state=")) {
            await auth0Client.handleRedirectCallback();
            console.log("Redirect callback handled");
            window.history.replaceState({}, document.title, "/"); // Remove query parameters
        }

        if (await auth0Client.isAuthenticated()) {
            const user = await auth0Client.getUser();
            console.log("User authenticated:", user);
            attachButtonListeners(user);
        } else {
            console.log("User not authenticated");
        }
    } catch (error) {
        console.error("Error handling auth callback:", error);
    }
};

// Attach event listeners to buttons
const attachButtonListeners = (user) => {
    const buttons = [
        { id: "signOutBtn", action: signOut },
        { id: "myAccountBtn", action: () => (window.location.href = "MyAccount.html") },
        {
            id: "findMyHolidayButton",
            action: () => {
                if (validateInputs()) {
                    console.log("Inputs validated, triggering personalization");
                    triggerPersonalization(user);
                }
            },
        },
    ];

    buttons.forEach(({ id, action }) => {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener("click", action);
            console.log(`Event listener attached to ${id}`);
        } else {
            console.error(`Button with ID ${id} not found`);
        }
    });
};

// Trigger personalization logic
const triggerPersonalization = async (user) => {
    try {
        console.log("Starting personalization for user:", user);
        const recommendations = await generateRecommendations(user);
        console.log("Recommendations generated:", recommendations);

        const urlParams = new URLSearchParams({
            user: user.name,
            recommendations: JSON.stringify(recommendations),
        }).toString();

        window.location.href = `HolidayResults.html?${urlParams}`;
    } catch (error) {
        console.error("Error in personalization:", error);
    }
};

// Generate holiday recommendations (mock function)
const generateRecommendations = async (user) => {
    console.log("Generating recommendations for user:", user);
    const destinations = ["Paris", "Tokyo", "New York"];
    return destinations[Math.floor(Math.random() * destinations.length)];
};

// Validate inputs from the form
const validateInputs = () => {
    const checkInDate = document.getElementById("holidayDate").value;
    const checkOutDate = document.getElementById("returnDate").value;
    const budget = parseFloat(document.getElementById("budget").value);
    const numPeople = parseInt(document.getElementById("numPeople").value, 10);

    const errors = [];
    if (!checkInDate || !checkOutDate || new Date(checkInDate) >= new Date(checkOutDate)) {
        errors.push("Invalid check-in or check-out dates");
    }
    if (isNaN(budget) || budget <= 0) {
        errors.push("Budget must be a positive number");
    }
    if (isNaN(numPeople) || numPeople <= 0) {
        errors.push("Number of people must be a positive number");
    }

    if (errors.length > 0) {
        console.error("Validation errors:", errors);
        alert(errors.join("\n"));
        return false;
    }
    return true;
};

// Ensure Auth0 is configured and set up event listeners on page load
window.onload = async () => {
    console.log("Initializing...");
    await configureClient();

    try {
        await handleAuthCallback();
    } catch (error) {
        console.error("Error during initialization:", error);
    }
};


