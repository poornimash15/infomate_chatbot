const Container = document.querySelector(".container");
const chatContainer = document.querySelector(".chat-container");
const PromptForm = document.querySelector(".prompt-form");
const PromptInput = PromptForm.querySelector(".prompt-input");
const fileInput = PromptForm.querySelector("#file-input");
const fileUploadWrapper = PromptForm.querySelector(".file-upload-wrapper");
const themeToggle = document.querySelector("#theme-toogle-btn");

// API key generation
const API_KEY = "AIzaSyA2V2i2LcUgUoc8jSps-yjpyomMxwvgDM0";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

let typingInterval, controller;
const chatHistory = [];
let userMessage = "";
let stopRequested = false;
const userData = { file: {} };

// Create message element helper
const createMsgElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

const scrollToBottom = () =>
  chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: "smooth" });

const typingEffect = (text, textElemennt, botMsgDiv) => {
  textElemennt.textContent = "";
  const words = text.split(" ");
  let wordindex = 0;

  typingInterval = setInterval(() => {
    if (wordindex < words.length) {
      textElemennt.textContent += (wordindex === 0 ? "" : " ") + words[wordindex++];
      scrollToBottom();
    } else {
      clearInterval(typingInterval);
      botMsgDiv.classList.remove("loading");
      document.body.classList.remove("bot-responding");
    }
  }, 40);
};

const generateResponse = async (botMsgDiv) => {
  const textElemennt = botMsgDiv.querySelector(".text-message");
  controller = new AbortController();

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: userMessage }],
          },
        ],
      }),
      signal: controller.signal,
    });

    const data = await response.json();
    console.log("🔹 Full API response:", data);

    if (!response.ok) throw new Error(data.error.message);

    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";

    console.log("Gemini says:", responseText);

    typingEffect(responseText, textElemennt, botMsgDiv);
  } catch (error) {
    console.error("API Error:", error);
    textElemennt.textContent = "Error. Check console!";
    botMsgDiv.classList.remove("loading");
    textElemennt.style.color="#d62939";
    textElemennt.textContent=error.name ==="AbortError"?"Response generation stopped." : error.message;
    botMsgDiv.classList.remove("loading");
    document.body.classList.remove("bot-responding");
  }
};

// Handle form submission
const handleFormsubmit = (e) => {
  e.preventDefault();
  userMessage = PromptInput.value.trim();

  if (!userMessage || document.body.classList.contains("bot-responding")) return;

  PromptInput.value = "";
  document.body.classList.add("bot-responding","chats-active");

  // Generate user message and add to chat container
  const userMSgHtml = ` <p class="text-message"> </p>`;
  const userMsgDiv = createMsgElement(userMSgHtml, "user-message");
  userMsgDiv.querySelector(".text-message").textContent = userMessage;
  chatContainer.appendChild(userMsgDiv);
  scrollToBottom();

  setTimeout(() => {
    // Generate bot message and add to chat container
    const botMSgHtml = `
  <div class="avatar">
    <img src="data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22256%22%20height%3D%22256%22%20viewBox%3D%220%200%20100%20100%22%20role%3D%22img%22%20aria-label%3D%22Infomate%20icon%203%22%3E%0A%20%20%3Cdefs%3E%0A%20%20%20%20%3ClinearGradient%20id%3D%22g3%22%20x1%3D%220%22%20x2%3D%221%22%20y1%3D%220%22%20y2%3D%221%22%3E%0A%20%20%20%20%20%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%2300b0ff%22%3E%3C%2Fstop%3E%0A%20%20%20%20%20%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%239b3bff%22%3E%3C%2Fstop%3E%0A%20%20%20%20%3C%2FlinearGradient%3E%0A%20%20%3C%2Fdefs%3E%0A%20%20%3Cpath%20d%3D%22M58%2026%20A22%2022%200%201%200%2036%2050%20L56%2050%22%20fill%3D%22none%22%20stroke%3D%22url(%23g3)%22%20stroke-width%3D%2212%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3C%2Fpath%3E%0A%20%20%3Ccircle%20cx%3D%2274%22%20cy%3D%2226%22%20r%3D%226%22%20fill%3D%22url(%23g3)%22%3E%3C%2Fcircle%3E%0A%3C%2Fsvg%3E%0A" class="avatar">
  </div>
  <p class="text-message">Just a sec...</p>
`;
    const botMsgDiv = createMsgElement(botMSgHtml, "bot-message", "loading", "active");

    chatContainer.appendChild(botMsgDiv);
    scrollToBottom();
    generateResponse(botMsgDiv);
  }, 600);
};

// Stop button handler
document.querySelector("#stop-promt-btn").addEventListener("click", () => {
  userData.file = {};
  controller?.abort();
   stopRequested = true;
  clearInterval(typingInterval);

  const loadingBotMsg = chatContainer.querySelector(".bot-message.loading");
  if (loadingBotMsg) loadingBotMsg.classList.remove("loading");
  document.body.classList.remove("bot-responding");
});

document.querySelector("#delete-chats-btn").addEventListener("click", () => {
  chatHistory.length=0;
  chatContainer.innerHTML= "";
  document.body.classList.remove("bot-responding","chats-active");

});

document.querySelectorAll(".suggestion-item").forEach(item=>{
  item.addEventListener("click",()=>{
    PromptInput.value=item.querySelector(".text").textContent;
    PromptForm.dispatchEvent(new Event("submit"));

  });

});

themeToggle.addEventListener("click",()=>{
  const isLightTheme=document.body.classList.toggle("light-theme");
  localStorage.setItem("themeColor",isLightTheme?"light_mode":"dark_mode");
  themeToggle.textContent=isLightTheme?"dark_mode":"light_mode";
});

const isLightTheme=localStorage.getItem("themeColor")==="light_mode";
document.body.classList.toggle("light-theme",isLightTheme);
themeToggle.textContent=isLightTheme?"dark_mode":"light_mode";



PromptForm.addEventListener("submit", handleFormsubmit);
