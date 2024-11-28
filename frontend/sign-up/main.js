document.getElementById('signupForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const username = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }

    try {
        const response = await fetch('/sign-up', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password, confirmPassword })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Sign up failed');
        }

        // Store the token in localStorage
        localStorage.setItem('token', data.token);

        // Redirect to home page
        window.location.href = '/';
    } catch (error) {
        alert(error.message);
    }
});
