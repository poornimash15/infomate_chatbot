const Container = document.querySelector(".container");
const chatContainer = document.querySelector(".chat-container");
const PromptForm = document.querySelector(".prompt-form");
const PromptInput = PromptForm.querySelector(".prompt-input");
const fileInput = PromptForm.querySelector("#file-input");
const fileUploadWrapper = PromptForm.querySelector(".file-upload-wrapper");
const themeToggle = document.querySelector("#theme-toogle-btn");
const voiceBtn = document.querySelector("#voice-input-btn");

// API key generation
const API_KEY = "AIzaSyA2V2i2LcUgUoc8jSps-yjpyomMxwvgDM0";
const API_URL =' https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}';

let typingInterval, controller;
const chatHistory = [];
let userMessage = "";
let stopRequested = false;
const userData = { message: "", file: {} };
let recognition;

// ===============================
// HELPERS
// ===============================
const createMsgElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

const scrollToBottom = () =>
  chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: "smooth" });

const typingEffect = (text, textElement, botMsgDiv) => {
  textElement.textContent = "";
  clearInterval(typingInterval);

  // Remove all asterisks (*)
  text = text.replace(/\*/g, "");

  const lines = text.split("\n").map(line => line.trim()).filter(line => line);

  const ul = document.createElement("ul");
  ul.style.margin = "8px 0";
  ul.style.paddingLeft = "20px";

  lines.forEach(line => {
    const li = document.createElement("li");
    li.textContent = line.replace(/^-+\s*/, ""); // remove existing "-" if any
    ul.appendChild(li);
  });

  textElement.appendChild(ul);
  botMsgDiv.classList.remove("loading");
  document.body.classList.remove("bot-responding");
  scrollToBottom();
};

// ===============================
// GEMINI API RESPONSE
// ===============================
const generateResponse = async (botMsgDiv) => {
  const textElement = botMsgDiv.querySelector(".text-message");
  controller = new AbortController();

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Answer the following in bullet points (use '-' or numbers, do not use '*'):
Question: ${userMessage || "Please describe this file/image."}`,
              },
              ...(userData.file.data
                ? [
                    {
                      inline_data: (({ fileName, isImage, ...rest }) => rest)(
                        userData.file
                      ),
                    },
                  ]
                : []),
            ],
          },
        ],
      }),
      signal: controller.signal,
    });

    const data = await response.json();
    console.log("🔹 Full API response:", data);

    if (!response.ok) throw new Error(data.error.message);

    const parts = data.candidates?.[0]?.content?.parts || [];
    let responseText = parts.map((p) => p.text).join(" ").trim();

    // Remove all asterisks just in case
    responseText = responseText.replace(/\*/g, "");

    console.log("Gemini says:", responseText);

    typingEffect(responseText, textElement, botMsgDiv);
    speakText(responseText);

    chatHistory.push({ role: "model", parts: [{ text: responseText }] });
  } catch (error) {
    console.error("API Error:", error);
    textElement.textContent =
      error.name === "AbortError"
        ? "Response generation stopped."
        : error.message;
    textElement.style.color = "#d62939";
    botMsgDiv.classList.remove("loading");
    document.body.classList.remove("bot-responding");
  } finally {
    userData.file = {};
  }
};

// ===============================
// HANDLE USER SUBMIT
// ===============================
const handleFormsubmit = (e) => {
  e.preventDefault();
  userMessage = PromptInput.value.trim();

  if (!userMessage || document.body.classList.contains("bot-responding")) return;

  PromptInput.value = "";
  userData.message = userMessage;
  document.body.classList.add("bot-responding", "chats-active");

  // User Message
  const userMsgHtml = `
    <p class="text-message"></p>
    ${
      userData.file.data
        ? userData.file.isImage
          ? <img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment" />
          : `<p class="file-attachment">
               <span class="material-symbols-rounded">description</span>
               ${userData.file.fileName}
             </p>`
        : ""
    }
  `;
  const userMsgDiv = createMsgElement(userMsgHtml, "user-message");
  userMsgDiv.querySelector(".text-message").textContent = userMessage;
  chatContainer.appendChild(userMsgDiv);
  scrollToBottom();

  // Bot Message
  setTimeout(() => {
    const botMsgHtml = `
      <div class="logo"><img src="logo.png" class="logo"></div>
      <p class="text-message">Just a sec...</p>
    `;
    const botMsgDiv = createMsgElement(botMsgHtml, "bot-message", "loading", "active");
    chatContainer.appendChild(botMsgDiv);
    scrollToBottom();
    generateResponse(botMsgDiv);
  }, 600);
};

// ===============================
// FILE HANDLING
// ===============================
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;
  const isImage = file.type.startsWith("image/");
  const reader = new FileReader();
  reader.readAsDataURL(file);

  reader.onload = (e) => {
    fileInput.value = "";
    const base64String = e.target.result.split(",")[1];
    fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
    fileUploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");

    userData.file = { fileName: file.name, data: base64String, mime_type: file.type, isImage };
  };
});

document.querySelector("#cancel-file-btn").addEventListener("click", () => {
  userData.file = {};
  fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");
});

// ===============================
// STOP + DELETE + SUGGESTIONS
// ===============================
document.querySelector("#stop-response-btn").addEventListener("click", () => {
  userData.file = {};
  controller?.abort();
  stopRequested = true;
  clearInterval(typingInterval);
  const loadingBotMsg = chatContainer.querySelector(".bot-message.loading");
  if (loadingBotMsg) loadingBotMsg.classList.remove("loading");
  document.body.classList.remove("bot-responding");
});

document.querySelector("#delete-chats-btn").addEventListener("click", () => {
  chatHistory.length = 0;
  chatContainer.innerHTML = "";
  document.body.classList.remove("bot-responding", "chats-active");
});

document.querySelectorAll(".suggestion-item").forEach((item) => {
  item.addEventListener("click", () => {
    PromptInput.value = item.querySelector(".text").textContent;
    PromptForm.dispatchEvent(new Event("submit"));
  });
});

// ===============================
// SPEECH RECOGNITION
// ===============================
if ("webkitSpeechRecognition" in window) {
  recognition = new webkitSpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  recognition.onstart = () => voiceBtn.classList.add("listening");
  recognition.onend = () => voiceBtn.classList.remove("listening");
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    PromptInput.value = transcript;
    PromptForm.dispatchEvent(new Event("submit"));
  };
} else {
  console.warn("Speech Recognition not supported in this browser.");
  voiceBtn.style.display = "none";
}
voiceBtn.addEventListener("click", () => recognition && recognition.start());

// ===============================
// THEME TOGGLE
// ===============================
themeToggle.addEventListener("click", () => {
  const isLightTheme = document.body.classList.toggle("light-theme");
  localStorage.setItem("themeColor", isLightTheme ? "light_mode" : "dark_mode");
  themeToggle.textContent = isLightTheme ? "dark_mode" : "light_mode";
});
const isLightTheme = localStorage.getItem("themeColor") === "light_mode";
document.body.classList.toggle("light-theme", isLightTheme);
themeToggle.textContent = isLightTheme ? "dark_mode" : "light_mode";

// ===============================
// TEXT TO SPEECH
// ===============================
const ttsBtn = document.getElementById("tts-toggle-btn");
const voiceSelect = document.getElementById("voiceSelect");

let voices = [];
let selectedVoice = null;
let isSpeaking = false;
let utterance;

function loadVoices() {
  voices = window.speechSynthesis.getVoices();
  voiceSelect.innerHTML = "";
  voices.forEach((voice, i) => {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = `${voice.name} (${voice.lang})`;
    if (voice.default) option.textContent += " ★";
    voiceSelect.appendChild(option);
  });
  if (voices.length > 0) {
    voiceSelect.value = voices.findIndex((v) => v.default) || 0;
    selectedVoice = voices[voiceSelect.value];
  }
}
window.speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

voiceSelect.addEventListener("change", () => {
  selectedVoice = voices[voiceSelect.value];
});

function speakText(text) {
  if (!("speechSynthesis" in window)) {
    alert("Sorry, your browser does not support Text-to-Speech.");
    return;
  }
  window.speechSynthesis.cancel();
  utterance = new SpeechSynthesisUtterance(text);
  if (selectedVoice) {
    utterance.voice = selectedVoice;
    utterance.lang = selectedVoice.lang;
  } else {
    utterance.lang = "en-US";
  }
  utterance.rate = 1;
  utterance.pitch = 1.1;
  window.speechSynthesis.speak(utterance);
  isSpeaking = true;
  utterance.onend = () => {
    isSpeaking = false;
    ttsBtn.textContent = "volume_up";
  };
}

// Manual button: read last bot message
ttsBtn.addEventListener("click", () => {
  if (isSpeaking) {
    window.speechSynthesis.cancel();
    isSpeaking = false;
    ttsBtn.textContent = "volume_up";
  } else {
    const lastBotMsg = document.querySelector(".chat-container .bot-message:last-child");
    if (lastBotMsg && lastBotMsg.textContent.trim() !== "") {
      speakText(lastBotMsg.textContent);
      ttsBtn.textContent = "volume_off";
    }
  }
});

// ===============================
// AUTO GREETING ON LOAD
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  function speak(text) {
    const synth = window.speechSynthesis;

    function setVoice() {
      const voices = synth.getVoices();

      let voice = voices.find(
        (v) =>
          v.name.toLowerCase().includes("female") ||
          v.name.toLowerCase().includes("woman") ||
          v.name.toLowerCase().includes("girl")
      );

      if (!voice) {
        voice = voices.find((v) => v.lang === "en-US") || voices[0];
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      utterance.pitch = 1;
      utterance.rate = 1;
      synth.speak(utterance);
    }

    if (synth.getVoices().length === 0) {
      synth.onvoiceschanged = setVoice;
    } else {
      setVoice();
    }
  }

  setTimeout(() => {
    speak("Welcome to InfoMate. How can I help you today?");
  }, 1000);
});

// ===============================
// BIND FORM
// ===============================
PromptForm.addEventListener("submit", handleFormsubmit);
PromptForm.querySelector("#add-file-btn").addEventListener("click", () => fileInput.click());