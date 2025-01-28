let auth0Client = null;

// Configure the Auth0 client
const configureClient = async () => {
    if (auth0Client) return; // Avoid re-initialization
    try {
        auth0Client = await createAuth0Client({
            domain: "dev-h4hncqco2n4yrt6z.us.auth0.com",
            client_id: "eUlv5NFe6rjQbLztvS8MsikdIlznueaU",
            redirect_uri: window.location.origin,
        });
        console.log("Auth0 client configured successfully");
    } catch (error) {
        console.error("Error configuring Auth0 client:", error);
        alert("Authentication service is unavailable. Please try again later.");
    }
};

// Sign out the user
const signOut = async () => {
    if (!auth0Client) {
        console.error("Auth0 client is not initialized");
        alert("Authentication service is unavailable. Please try again later.");
        return;
    }

    try {
        await auth0Client.logout({ returnTo: window.location.origin });
        console.log("User signed out successfully");
        window.location.href = "index.html";
    } catch (error) {
        console.error("Error signing out user:", error);
        alert("An error occurred during sign-out. Please try again.");
    }
};

// Handle authentication callback
const handleAuthCallback = async () => {
    if (!auth0Client) {
        console.error("Auth0 client is not initialized");
        alert("Authentication service is unavailable. Please try again later.");
        return;
    }

    try {
        if (await auth0Client.isAuthenticated()) {
            const user = await auth0Client.getUser();
            console.log("User is authenticated:", user);
            attachButtonListeners(user);
        } else {
            const query = window.location.search;
            if (query.includes("code=") && query.includes("state=")) {
                await auth0Client.handleRedirectCallback();
                console.log("Handled redirect callback");
                window.location.href = "indexsignedin.html";
            }
        }
    } catch (error) {
        console.error("Error handling authentication callback:", error);
        alert("An error occurred during authentication. Please try again.");
    }
};

// Attach event listeners to buttons
const attachButtonListeners = (user) => {
    const buttons = [
        { id: "signOutBtn", action: signOut },
        { id: "myAccountBtn", action: () => (window.location.href = "MyAccount.html") },
        {
            id: "findMyHolidayButton",
            action: async () => {
                if (validateInputs()) await triggerPersonalization(user);
            },
        },
    ];

    buttons.forEach(({ id, action }) => {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener("click", action);
            console.log(`${id} event listener added`);
        } else {
            console.error(`${id} not found`);
        }
    });
};

// Trigger personalization process
const triggerPersonalization = async (user) => {
    try {
        console.log("Triggering personalization process for user:", user);
        await personalizeContent(user);
    } catch (error) {
        console.error("Error during personalization process:", error);
        alert("An error occurred while personalizing your content. Please try again.");
    }
};

// Generate holiday recommendations based on user data
const generateRecommendations = async (user) => {
    try {
        console.log("Generating recommendations for user:", user);

        // Example recommendation logic
        const recommendations = ["Paris", "New York", "Tokyo"];
        return recommendations[Math.floor(Math.random() * recommendations.length)];
    } catch (error) {
        console.error("Error generating recommendations:", error);
        throw new Error("Error generating recommendations");
    }
};

// Validate input fields
const validateInputs = () => {
    const checkInDate = document.getElementById("holidayDate").value;
    const checkOutDate = document.getElementById("returnDate").value;
    const budget = parseFloat(document.getElementById("budget").value);
    const numPeople = parseInt(document.getElementById("numPeople").value, 10);

    const currentDate = new Date();
    const nextYearDate = new Date(currentDate);
    nextYearDate.setFullYear(nextYearDate.getFullYear() + 1);

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    let valid = true;

    const validations = [
        {
            condition: checkIn < currentDate || checkIn > nextYearDate || checkOut < currentDate || checkOut > nextYearDate,
            element: ["holidayDate", "returnDate"],
            message: "Dates must be within the next year.",
        },
        {
            condition: isNaN(budget) || budget <= 0 || budget > 5000,
            element: "budget",
            message: "Budget must be a number between 1 and 5000.",
        },
        {
            condition: isNaN(numPeople) || numPeople <= 0 || numPeople > 5,
            element: "numPeople",
            message: "Number of people must be between 1 and 5.",
        },
    ];

    validations.forEach(({ condition, element, message }) => {
        if (condition) {
            valid = false;
            [].concat(element).forEach((id) => flashRed(id, message));
        }
    });

    return valid;
};

const flashRed = (elementId, message) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.style.border = "2px solid red";
    element.setAttribute("title", message);

    setTimeout(() => {
        element.style.border = "";
        element.removeAttribute("title");
    }, 2000);
};

// Retry fetch requests with exponential backoff
const retryFetch = async (url, options, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.ok) return response.json();
            console.error(`Attempt ${i + 1} failed: ${response.statusText}`);
        } catch (error) {
            console.error(`Attempt ${i + 1} error: ${error.message}`);
        }
        await new Promise((res) => setTimeout(res, delay * Math.pow(2, i))); // Exponential backoff
    }
    throw new Error(`Failed to fetch after ${retries} attempts`);
};

// Personalize content based on user data
const personalizeContent = async (user) => {
    try {
        console.log("Personalizing content for user:", user);

        const destination = await generateRecommendations(user);
        const checkInDate = document.getElementById("holidayDate").value;
        const checkOutDate = document.getElementById("returnDate").value;
        const departureLocation = document.getElementById("departureLocation").value;

        const { configData, airportData } = await Promise.all([fetchConfigData(), fetchAirportData()]);
        const roundtripFlights = await searchRoundtripFlights(departureLocation, destination);
        const cheapestOneWay = await fetchCheapestOneWayFlight(departureLocation, destination, checkInDate, "US", "USD", "en-US");

        if (!roundtripFlights || !cheapestOneWay) {
            throw new Error("Error fetching flights");
        }

        const hotelData = await fetchHotelData(destination);
        if (!hotelData) throw new Error("Error fetching hotels");

        const urlParams = new URLSearchParams({
            welcomeMessage: sanitizeInput(`Hello, ${user.name}!`),
            userEmail: sanitizeInput(`Your email: ${user.email}`),
            flightInfo: sanitizeInput(JSON.stringify(roundtripFlights)),
            hotelInfo: sanitizeInput(JSON.stringify(hotelData)),
        }).toString();

        window.location.href = `HolidayResults.html?${urlParams}`;
    } catch (error) {
        console.error("Error personalizing content:", error);
        alert("An error occurred while personalizing your content. Please try again.");
    }
};

// Sanitize input to prevent injection attacks
const sanitizeInput = (input) => input.replace(/[^a-zA-Z0-9 ]/g, "");

// Initialize the app
window.onload = async () => {
    console.log("Window onload event fired");
    await configureClient();
    await handleAuthCallback();
};
