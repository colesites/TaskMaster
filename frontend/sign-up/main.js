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
  .getElementById("signupForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const username = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      const API_URL =
        window.location.hostname === "localhost"
          ? "http://localhost:3000/sign-up"
          : "https://task-master-rose-three.vercel.app/sign-up"; // Replace with your actual Vercel backend URL

      const response = await fetch(`${API_URL}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ username, email, password, confirmPassword }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server error: Invalid response format");
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Sign up failed");
      }

      const data = await response.json();

      // Store the token in localStorage
      if (data.token) {
        // Store the token in localStorage
        localStorage.setItem("token", data.token);

        // Redirect to home page using the provided redirect URL
        window.location.href = data.redirect || "/";
      } else {
        throw new Error("No token received from server");
      }
    } catch (err) {
      if (err.name === "SyntaxError") {
        alert("Server error: Invalid response format");
      } else {
        alert(err.message || "An error occurred during sign up");
      }
    }
  });
