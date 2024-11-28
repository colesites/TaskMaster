// Check if user is already logged in
function checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        window.location.href = '/';
        return;
    }
}

// Run auth check when page loads
document.addEventListener('DOMContentLoaded', checkAuth);

document.getElementById('signinForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/sign-in', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Sign in failed');
        }

        // Store the token in localStorage
        localStorage.setItem('token', data.token);

        // Redirect to home page
        window.location.href = '/';
    } catch (error) {
        alert(error.message);
    }
});
