window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const welcomeMessage = urlParams.get('welcomeMessage');
    const userEmail = urlParams.get('userEmail');
    const flightInfo = urlParams.get('flightInfo');
    const hotelInfo = urlParams.get('hotelInfo');

    if (welcomeMessage) {
        document.getElementById('welcome-message').innerText = welcomeMessage;
    }
    if (userEmail) {
        document.getElementById('user-email').innerText = userEmail;
    }
    if (flightInfo) {
        document.getElementById('flight-info').innerText = flightInfo;
    }
    if (hotelInfo) {
        document.getElementById('hotel-info').innerText = hotelInfo;
    }

    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', () => {
            auth0Client.logout({
                returnTo: window.location.origin
            });
        });
    }
};
