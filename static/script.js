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
    const userMessage = queryInput.value.trim();
    if (!userMessage) return alert("Harap masukkan pertanyaan.");
    
    // Menampilkan pesan pengguna langsung
    displayUserMessage(userMessage);
    await sendQuery(userMessage);
});

// Fungsi untuk menampilkan pesan pengguna
function displayUserMessage(message) {
    const userMessageHTML = `
        <div class="chat-row user-row">
            <div class="chat-content user-bubble">
                <div class="bubble-text">${message}</div>
                <img src="/static/profil pengguna.png" alt="Profil Pengguna" class="profile-pic">
            </div>
        </div>
    `;
    chatBox.innerHTML += userMessageHTML; // Menambahkan pesan pengguna ke chat box
    chatBox.scrollTop = chatBox.scrollHeight; // Scroll otomatis ke bawah
}

async function sendQuery(query) {
    try {
        queryInput.value = ""; 
        
        // Show typing animation with dots
        const botMessageHTML = `
            <div class="chat-row bot-row">
                <div class="chat-content chat-bubble">
                    <img src="/static/profil bot.png" alt="Profil Bot" class="profile-pic">
                    <div class="bubble-text">
                        <div class="typing-animation">
                            <div class="dot"></div>
                            <div class="dot"></div>
                            <div class="dot"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        chatBox.innerHTML += botMessageHTML; // Add typing animation
        chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the bottom
        
        const response = await fetch("/ask", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ query })
        });

        if (response.ok) {
            const data = await response.json(); // Get the response data
            if (data.response) {
                // Remove the typing animation and show the bot's actual message
                const typingElement = chatBox.querySelector('.typing-animation');
                if (typingElement) typingElement.parentElement.parentElement.remove();

                displayBotMessage(data.response.answer); // Show the actual bot's response
            }
        } else {
            throw new Error("Gagal mengirim query.");
        }
    } catch (error) {
        console.error(error.message);
        alert("Terjadi kesalahan saat mengirim pertanyaan.");
    }
}

// Display the actual bot message
function displayBotMessage(message) {
    const botMessageHTML = `
        <div class="chat-row bot-row">
            <div class="chat-content chat-bubble">
                <img src="/static/profil bot.png" alt="Profil Bot" class="profile-pic">
                <div class="bubble-text">${message}
                    <button class="listen-btn" onclick="toggleSpeak(this)">
                        <i class="bi bi-volume-up-fill"></i>
                    </button>
                    <button class="copy-btn" onclick="copyText(this)">
                        <i class="bi bi-clipboard-fill"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    chatBox.innerHTML += botMessageHTML; // Add the bot message to chat
    chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the bottom
}

async function clearChatMessage() {
    // Show confirmation alert
    const result = await Swal.fire({
        title: 'Hapus Semua Pesan?',
        text: "Apakah Anda yakin ingin menghapus semua pesan?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Ya, hapus!',
        cancelButtonText: 'Batal'
    });

    // Check if the user confirmed the action
    if (result.isConfirmed) {
        const response = await fetch("/clear", { method: "POST" });
        if (response.ok) {
            const chatRows = chatBox.querySelectorAll(".chat-row");
            chatRows.forEach(row => row.remove());

            // Show success alert
            Swal.fire({
                title: 'Berhasil!',
                text: 'Semua pesan telah dihapus.',
                icon: 'success',
                confirmButtonColor: '#3085d6',
                confirmButtonText: 'OK'
            });
        } else {
            // Show error alert
            Swal.fire({
                title: 'Gagal!',
                text: 'Gagal menghapus pesan. Silakan coba lagi.',
                icon: 'error',
                confirmButtonColor: '#3085d6',
                confirmButtonText: 'OK'
            });
        }
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
        
        // Menampilkan pesan pengguna
        displayUserMessage(speechResult);

        // Mengirimkan query
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
        hideMicrophonePopup(); // Sembunyikan pop-up saat pengenalan suara selesai
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
        hideMicrophonePopup(); // Sembunyikan pop-up
    } else {
        recognition.start();
        isMicrophoneActive = true;
        microphoneButton.innerHTML = '<i class="bi bi-stop-circle"></i>';
        showMicrophonePopup(); // Tampilkan pop-up
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
