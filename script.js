document.addEventListener("DOMContentLoaded", () => {
  const sendBtn = document.getElementById("sendBtn");
  const userInput = document.getElementById("userInput");
  const chatOutput = document.getElementById("chatOutput");
  const cnnImageUpload = document.getElementById("cnnImageUpload");
  const cnnImgPreview = document.getElementById("cnnImgPreview");
  const cnnResult = document.getElementById("cnnResult");
  const cnnExplanation = document.getElementById("cnnExplanation");
  const themeToggle = document.getElementById("toggle-theme");
  
  // Check for saved theme preference or default to light theme
  const savedTheme = localStorage.getItem('theme') || 'light-theme';
  document.body.className = savedTheme;
  updateThemeButtonText();

  // Theme toggle functionality
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      if (document.body.classList.contains("light-theme")) {
        document.body.classList.remove("light-theme");
        document.body.classList.add("dark-theme");
        localStorage.setItem('theme', 'dark-theme');
      } else {
        document.body.classList.remove("dark-theme");
        document.body.classList.add("light-theme");
        localStorage.setItem('theme', 'light-theme');
      }
      updateThemeButtonText();
    });
  }

  function updateThemeButtonText() {
    if (themeToggle) {
      const isDarkMode = document.body.classList.contains("dark-theme");
      themeToggle.textContent = isDarkMode ? "Switch to Light Theme" : "Switch to Dark Theme";
    }
  }

  async function sendMessage(message) {
    try {
      console.log('Sending message:', message); // Debug log
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: message })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      return data.reply;
    } catch (error) {
      console.error('Error details:', error);
      return `Sorry, I encountered an error: ${error.message}. Please try again.`;
    }
  }

  if (sendBtn && userInput && chatOutput) {
    sendBtn.addEventListener("click", async () => {
      const message = userInput.value.trim();
      if (!message) return;

      // Display user message
      chatOutput.innerHTML += `<div class="message user"><div class="bubble">${message}</div></div>`;
      
      // Show loading indicator
      chatOutput.innerHTML += `<div class="message ai" id="loading"><div class="bubble">Thinking...</div></div>`;
      
      // Clear input
      userInput.value = "";
      
      // Get AI response
      const response = await sendMessage(message);
      
      // Remove loading indicator and show response
      const loadingMessage = document.getElementById("loading");
      if (loadingMessage) loadingMessage.remove();
      
      chatOutput.innerHTML += `<div class="message ai"><div class="bubble">${response}</div></div>`;
      
      // Scroll to bottom
      chatOutput.scrollTop = chatOutput.scrollHeight;
    });

    // Allow Enter key to send message
    userInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        sendBtn.click();
      }
    });
  }

  if (cnnImageUpload) {
    cnnImageUpload.addEventListener("change", async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      // Show image preview and status
      cnnImgPreview.src = URL.createObjectURL(file);
      cnnImgPreview.style.display = "block";
      cnnResult.innerHTML = "<em>Analysing image...</em>";

      try {
        const base64Image = await toBase64(file);
        console.log("Image converted to base64"); // Debug log

        const response = await fetch('http://localhost:3000/api/analyse-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            image: base64Image.split(',')[1] // Remove data URL prefix
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("API Response:", data); // Debug log

        if (data.error) {
          throw new Error(data.error);
        }

        if (data.responses && data.responses[0].labelAnnotations) {
          const labels = data.responses[0].labelAnnotations
            .map(label => `${label.description} (${(label.score * 100).toFixed(2)}%)`)
            .join('<br>');
          cnnResult.innerHTML = "<strong>Detected objects:</strong><br>" + labels;
          cnnExplanation.textContent = "Confidence scores shown in parentheses.";
        } else {
          cnnResult.textContent = "No objects detected in the image.";
          cnnExplanation.textContent = "";
        }
      } catch (error) {
        console.error('Error details:', error); // Debug log
        cnnResult.textContent = `Error analysing image: ${error.message}`;
        cnnExplanation.textContent = "Please try again with a different image.";
      }
    });
  }

  // Add spam detection functionality
  const checkSpamButton = document.getElementById("checkSpam");
  const emailInput = document.getElementById("emailInput");
  const result = document.getElementById("result");

  if (checkSpamButton && emailInput && result) {
    checkSpamButton.addEventListener("click", () => {
      const emailText = emailInput.value.trim();
      if (!emailText) {
        result.innerHTML = `<p class="text-warning">Please enter some email content to check.</p>`;
        return;
      }

      // List of spam keywords
      const spamKeywords = [
        "win", "winner", "won", "prize", "lottery",
        "free", "gift", "bonus",
        "cash", "money", "dollars", "$$$",
        "urgent", "act now", "limited time",
        "click here", "click below",
        "guarantee", "guaranteed",
        "credit card", "bank account",
        "Nigerian", "prince",
        "cryptocurrency", "bitcoin",
        "investment opportunity",
        "make money fast", "earn money",
        "work from home", "be your own boss",
        "weight loss", "lose weight",
        "miracle", "amazing",
        "buy now", "order now",
        "discount", "cheap", "lowest price",
        "subscribe", "unsubscribe",
        "viagra", "medication",
        "casino", "betting"
      ];

      // Count matches
      let matches = 0;
      const foundKeywords = new Set();
      const textLower = emailText.toLowerCase();

      spamKeywords.forEach(keyword => {
        if (textLower.includes(keyword.toLowerCase())) {
          matches++;
          foundKeywords.add(keyword);
        }
      });

      // Simple scoring
      let score = matches / spamKeywords.length;
      let message = "";
      if (score === 0) {
        message = `<span class="text-success">Not Spam</span>`;
      } else if (score < 0.1) {
        message = `<span class="text-warning">Possibly Spam</span>`;
      } else {
        message = `<span class="text-danger">Spam</span>`;
      }

      result.innerHTML = `
        <p><strong>Result:</strong> ${message}</p>
        <p><strong>Matched keywords:</strong> ${Array.from(foundKeywords).join(", ") || "None"}</p>
      `;
    });
  }

  // Quiz functionality for beginner.html
  const quizForm = document.getElementById("quizForm");
  if (quizForm) {
    quizForm.addEventListener("submit", function (e) {
      e.preventDefault();
      let correct = 0;
      const feedbacks = quizForm.querySelectorAll(".feedback");
      feedbacks.forEach(fb => fb.textContent = "");

      // Question 1
      const q1 = quizForm.querySelector('input[name="q1"]:checked');
      if (q1 && q1.value === "correct") {
        correct++;
        feedbacks[0].textContent = "Correct!";
        feedbacks[0].className = "feedback correct";
      } else {
        feedbacks[0].textContent = "Incorrect. AI is designed to perform tasks that require human intelligence.";
        feedbacks[0].className = "feedback incorrect";
      }

      // Question 2
      const q2 = quizForm.querySelector('input[name="q2"]:checked');
      if (q2 && q2.value === "correct") {
        correct++;
        feedbacks[1].textContent = "Correct!";
        feedbacks[1].className = "feedback correct";
      } else {
        feedbacks[1].textContent = "Incorrect. Neural networks are used to recognise patterns in data.";
        feedbacks[1].className = "feedback incorrect";
      }

      // Question 3
      const q3 = quizForm.querySelector('input[name="q3"]:checked');
      if (q3 && q3.value === "correct") {
        correct++;
        feedbacks[2].textContent = "Correct!";
        feedbacks[2].className = "feedback correct";
      } else {
        feedbacks[2].textContent = "Incorrect. Reinforcement learning is used for training AI agents through rewards and penalties.";
        feedbacks[2].className = "feedback incorrect";
      }

      const quizResult = document.getElementById("quizResult");
      quizResult.innerHTML = `<strong>You got ${correct} out of 3 correct!</strong>`;
    });
  }
});

// Helper function for image upload
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}