// Check if user is already logged in
function checkAuth() {
  const token = localStorage.getItem("token");
  if (token) {
    window.location.href = "/";
    return;
  }
}

// Run auth check when page loads
document.addEventListener("DOMContentLoaded", checkAuth);

document
  .getElementById("signinForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      const API_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:3000' 
        : 'https://task-master-rose-three.vercel.app/sign-in'; // Replace with your actual Vercel backend URL

      const response = await fetch(`${API_URL}/sign-in`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      // Check if the response has the correct content type
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server error: Invalid response format");
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Sign in failed");
      }

      // Store the token in localStorage
      localStorage.setItem("token", data.token);

      // Redirect to home page
      window.location.href = "/";
    } catch (error) {
      if (error.name === "SyntaxError") {
        alert("Server error: Invalid response format");
      } else {
        alert(error.message);
      }
    }
  });
