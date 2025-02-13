(async () => {
  console.log("✅ DOMContentLoaded event fired");

  // Ensure Auth0 SDK is available
  if (!window.Auth0Client) {
      console.error("Auth0 SDK failed to load.");
      document.body.innerHTML = `
          <h1 style="color: red">Service Unavailable</h1>
          <p>Authentication system is currently unavailable. Please try again later.</p>
      `;
      return;
  }

  // Auth0 Configuration
  let auth0Client = null;
  const config = {
      domain: "dev-h4hncqco2n4yrt6z.us.auth0.com",
      clientId: "eUlv5NFe6rjQbLztvS8MsikdIlznueaU",
      authorizationParams: {
          redirect_uri: "https://hwoolen03.github.io/indexsignedin",
          cacheLocation: "localstorage",
          useRefreshTokens: true
      }
  };

  try {
      auth0Client = new Auth0Client(config);
      console.log("✅ Auth0 initialized");
  } catch (error) {
      console.error("🚨 Auth0 initialization failed:", error);
      return;
  }

  // Handle Authentication Redirect
  const handleAuthRedirect = async () => {
      const query = window.location.search;
      if (query.includes("code=") && query.includes("state=")) {
          try {
              await auth0Client.handleRedirectCallback();
              window.history.replaceState({}, document.title, "https://hwoolen03.github.io/indexsignedin");
          } catch (error) {
              console.error("🚨 Redirect handling failed:", error);
              window.location.replace("https://hwoolen03.github.io");
          }
      }
  };

  // Authentication Handlers
  const loginHandlers = {
      github: () => auth0Client.loginWithRedirect({ authorizationParams: { connection: 'github' } }),
      google: () => auth0Client.loginWithRedirect({ authorizationParams: { connection: 'google-oauth2' } }),
      figma: () => auth0Client.loginWithRedirect({ authorizationParams: { connection: 'figma' } })
  };

  const logoutHandler = () => {
      auth0Client.logout({ returnTo: window.location.origin });
  };

  // UI Management
  const updateAuthUI = async () => {
      const isAuthenticated = await auth0Client.isAuthenticated();
      console.log("🔄 Authentication status:", isAuthenticated);
      
      document.getElementById('btn-logout').style.display = isAuthenticated ? "block" : "none";
      document.querySelectorAll('.auth-buttons button:not(#btn-logout)').forEach(btn => {
          btn.style.display = isAuthenticated ? "none" : "block";
      });

      if (isAuthenticated) {
          const user = await auth0Client.getUser();
          console.log("👤 Authenticated user:", user);
      }
  };

  // Event Listeners
  const initializeApp = () => {
      console.log("🎯 Initializing event listeners...");

      // Ensure buttons exist before adding event listeners
      const githubBtn = document.getElementById('btn-login-github');
      const googleBtn = document.getElementById('btn-login-google');
      const figmaBtn = document.getElementById('btn-login-figma');
      const logoutBtn = document.getElementById('btn-logout');

      if (!githubBtn || !googleBtn || !figmaBtn || !logoutBtn) {
          console.error("🚨 One or more buttons are missing from the DOM!");
          return;
      }

      githubBtn.addEventListener('click', loginHandlers.github);
      googleBtn.addEventListener('click', loginHandlers.google);
      figmaBtn.addEventListener('click', loginHandlers.figma);
      logoutBtn.addEventListener('click', logoutHandler);

      // Initial UI update
      updateAuthUI();
  };

  // Main Execution Flow
  try {
      await handleAuthRedirect();
      initializeApp();
  } catch (error) {
      console.error("🚨 Application initialization failed:", error);
  }
})();

