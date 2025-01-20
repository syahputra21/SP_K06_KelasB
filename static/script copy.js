// Constants and Variables
const form = document.getElementById("chat-form");
const chatBox = document.getElementById("chat-box");
const microphoneButton = document.getElementById("microphone-button");
const queryInput = document.getElementById("query");
const toggleSidebarBtn = document.getElementById("toggle-sidebar-btn");
const sidebar = document.querySelector(".sidebar");
const chatContainer = document.querySelector(".chat-container");
let isSpeaking = false;
let recognition;
let isMicrophoneActive = false;

// Sidebar toggle behavior
if (window.innerWidth <= 638) sidebar.classList.add("hidden");
toggleSidebarBtn.addEventListener("click", () => {
    sidebar.classList.toggle("hidden");
    chatContainer.classList.toggle("full-screen", sidebar.classList.contains("hidden"));
    toggleSidebarBtn.innerHTML = sidebar.classList.contains("hidden") ? 
        '<i class="bi bi-list"></i>' : '<i class="bi bi-x"></i>';
});

// Handle form submission
form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!queryInput.value.trim()) return alert("Harap masukkan pertanyaan.");
    await sendQuery(queryInput.value);
});

// Show typing animation
function showTypingAnimation() {
    const typingAnimation = document.getElementById("typing-animation");
    if (typingAnimation) typingAnimation.classList.remove("hidden");
}

// Hide typing animation
function hideTypingAnimation() {
    const typingAnimation = document.getElementById("typing-animation");
    if (typingAnimation) typingAnimation.classList.add("hidden");
}

// Send query to server
async function sendQuery(query) {
    try {
        queryInput.value = ""; 
        
        showTypingAnimation();
        const response = await fetch("/ask", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ query })
        });

        if (response.ok) {
            const data = await response.json();
            setTimeout(() => {
                hideTypingAnimation();
                if (data.response) location.reload();
            }, 2000);
        } else {
            throw new Error("Gagal mengirim query.");
        }
    } catch (error) {
        hideTypingAnimation();
        console.error(error.message);
        alert("Terjadi kesalahan saat mengirim pertanyaan.");
    }
}

// Clear chat messages
async function clearChatMessage() {
    const response = await fetch("/clear", { method: "POST" });
    if (response.ok) {
        const chatRows = chatBox.querySelectorAll(".chat-row:not(#typing-animation)");
        chatRows.forEach(row => row.remove());
        hideTypingAnimation();
    } else {
        alert("Gagal menghapus pesan.");
    }
}


// Toggle speech reading
function toggleSpeak(button) {
    if (isSpeaking) {
        stopSpeaking();
        button.innerHTML = '<i class="bi bi-volume-up"></i>';
    } else {
        const textToRead = button.parentElement.textContent.replace(/🔊|📋/g, '').trim();
        startSpeaking(textToRead, button);
        button.innerHTML = '<i class="bi bi-stop-circle"></i>';
    }
}

// Start reading text aloud
function startSpeaking(textToRead, button) {
    stopSpeaking();
    const chunks = splitTextIntoChunks(textToRead);
    let chunkIndex = 0;

    function readNextChunk() {
        if (chunkIndex < chunks.length) {
            const utterance = new SpeechSynthesisUtterance(chunks[chunkIndex]);
            utterance.lang = 'id-ID';
            utterance.onend = () => { chunkIndex++; readNextChunk(); };
            utterance.onerror = () => { stopSpeaking(); };
            speechSynthesis.speak(utterance);
        } else {
            isSpeaking = false;
            button.innerHTML = '<i class="bi bi-volume-up"></i>';
        }
    }

    isSpeaking = true;
    readNextChunk();
}

// Split text into smaller chunks
function splitTextIntoChunks(text) {
    const maxLength = 200;
    const regex = new RegExp(`(.{1,${maxLength}})([.?!\\s]|$)`, 'g');
    return text.match(regex).map(chunk => chunk.trim());
}

// Stop speaking
function stopSpeaking() {
    if (speechSynthesis.speaking) speechSynthesis.cancel();
    isSpeaking = false;
}

// Speech recognition setup
if ("webkitSpeechRecognition" in window) {
    recognition = new webkitSpeechRecognition();
    recognition.lang = "id-ID";
    recognition.onresult = async (event) => {
        const speechResult = event.results[0][0].transcript;
        queryInput.value = speechResult;
        await sendQuery(speechResult);
    };
    recognition.onerror = () => {
        isMicrophoneActive = false;
        microphoneButton.innerHTML = '<i class="bi bi-mic-fill"></i>';
        alert("Kesalahan saat memulai mikrofon. Silakan coba lagi.");
    };
    recognition.onend = () => {
        isMicrophoneActive = false;
        microphoneButton.innerHTML = '<i class="bi bi-mic-fill"></i>';
    };
} else {
    alert("Browser Anda tidak mendukung fitur Speech Recognition.");
}

// Handler untuk tombol mikrofon dengan animasi pop-up
microphoneButton.addEventListener("click", () => {
    if (isMicrophoneActive) {
        recognition.stop();
        isMicrophoneActive = false;
        microphoneButton.innerHTML = '<i class="bi bi-mic-fill"></i>';
        hideMicrophonePopup();
    } else {
        recognition.start();
        isMicrophoneActive = true;
        microphoneButton.innerHTML = '<i class="bi bi-stop-circle"></i>';
        showMicrophonePopup();
    }
});

// Fungsi untuk menampilkan pop-up mikrofon
function showMicrophonePopup() {
    const popup = document.getElementById("microphone-popup");
    popup.classList.remove("hidden");
    popup.style.display = "block"; // Menampilkan pop-up
}

// Fungsi untuk menyembunyikan pop-up mikrofon
function hideMicrophonePopup() {
    const popup = document.getElementById("microphone-popup");
    popup.classList.add("hidden");
    popup.style.display = "none"; // Menyembunyikan pop-up
}

// Copy text to clipboard
function copyText(button) {
    const textToCopy = button.parentElement.textContent.replace(/🔊|📋/g, '').trim();
    navigator.clipboard.writeText(textToCopy)
        .then(() => alert("Teks berhasil disalin!"))
        .catch(err => console.error("Gagal menyalin teks: ", err));
}

// Reset input field when page loads
window.addEventListener("load", () => queryInput.value = "");