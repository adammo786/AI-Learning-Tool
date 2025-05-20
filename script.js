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

      // Calculate spam likelihood
      let spamLikelihood;
      if (matches === 0) {
        spamLikelihood = 5;
      } else if (matches === 1) {
        spamLikelihood = 50;
      } else if (matches === 2) {
        spamLikelihood = 75;
      } else {
        spamLikelihood = 90;
      }

      // Create detailed result message
      let resultHTML = '';
      if (matches > 0) {
        resultHTML = `
          <div class="alert ${spamLikelihood >= 75 ? 'alert-danger' : 'alert-warning'}">
            <h4 class="alert-heading">Spam Likelihood: ${spamLikelihood}%</h4>
            <p>Detected spam keywords: ${Array.from(foundKeywords).join(", ")}</p>
            <hr>
            <p class="mb-0">The email contains ${matches} spam indicator${matches > 1 ? 's' : ''}.</p>
          </div>
        `;
      } else {
        resultHTML = `
          <div class="alert alert-success">
            <h4 class="alert-heading">Spam Likelihood: ${spamLikelihood}%</h4>
            <p>No spam keywords detected. This email appears to be legitimate.</p>
          </div>
        `;
      }

      result.innerHTML = resultHTML;

      // Scroll to result
      result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    // Allow Enter key in textarea to check spam
    emailInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault(); // Prevent new line
        checkSpamButton.click();
      }
    });
  }

  // Add Quiz functionality
  const quizForm = document.getElementById("quizForm");
  const quizResult = document.getElementById("quizResult");

  if (quizForm) {
    quizForm.addEventListener("submit", (e) => {
      e.preventDefault();
      
      // Correct answers
      const correctAnswers = {
        q1: "correct", // "Perform tasks that typically require human intelligence"
        q2: "correct", // "Recognise patterns in data"
        q3: "correct"  // "Training AI agents through rewards and penalties"
      };

      let score = 0;
      let total = Object.keys(correctAnswers).length;

      // Check each question
      Object.keys(correctAnswers).forEach(question => {
        const selectedAnswer = document.querySelector(`input[name="${question}"]:checked`);
        const feedbackElement = document.querySelector(`input[name="${question}"]`).closest('.quiz-item').querySelector('.feedback');
        
        if (selectedAnswer) {
          if (selectedAnswer.value === correctAnswers[question]) {
            score++;
            feedbackElement.textContent = "Correct! ✓";
            feedbackElement.className = "feedback correct";
          } else {
            feedbackElement.textContent = "Incorrect. Try again! ✗";
            feedbackElement.className = "feedback incorrect";
          }
        } else {
          feedbackElement.textContent = "Please select an answer.";
          feedbackElement.className = "feedback";
        }
      });

      // Display final score
      const percentage = (score / total) * 100;
      quizResult.innerHTML = `
        <div class="alert ${percentage === 100 ? 'alert-success' : 'alert-info'} mt-3">
          <h4>Your Score: ${score}/${total} (${percentage}%)</h4>
          <p>${getScoreMessage(percentage)}</p>
        </div>
      `;

      // Scroll to result
      quizResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  // Helper function for score messages
  function getScoreMessage(percentage) {
    if (percentage === 100) {
      return "Excellent! You have a great understanding of AI concepts! 🌟";
    } else if (percentage >= 66) {
      return "Good job! You're getting there. Review the incorrect answers and try again. 👍";
    } else if (percentage >= 33) {
      return "Keep learning! Review the AI concepts and try again. 📚";
    } else {
      return "Take some time to review the AI concepts and try again. You can do it! 💪";
    }
  }
});

// Helper function to convert image to Base64
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}