// Select elements
const signInBtn = document.getElementById('signInBtn');
const signUpBtn = document.getElementById('signUpBtn');
const loginFormContainer = document.getElementById('loginFormContainer');
const loginForm = document.getElementById('loginForm');
const closeForm = document.getElementById('closeForm');
const formTitle = document.getElementById('formTitle');

// Function to open the login form
function openForm(type) {
    formTitle.textContent = type === 'signIn' ? 'Sign In' : 'Sign Up';
    loginFormContainer.classList.remove('hidden');
    document.body.classList.add('modal-active');
}

// Function to close the login form
function closeLoginForm() {
    loginFormContainer.classList.add('hidden');
    document.body.classList.remove('modal-active');
}

// Event listeners for buttons
signInBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openForm('signIn');
});

signUpBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openForm('signUp');
});

closeForm.addEventListener('click', closeLoginForm);

// Handle form submission
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // Capture user input
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Simulate saving to a file (console output for now)
    console.log(`Username: ${username}, Password: ${password}`);

    // Reset form and close
    loginForm.reset();
    closeLoginForm();
});