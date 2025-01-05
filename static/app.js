let mediaRecorder;
let audioChunks = [];
let isRecording = false;

async function toggleRecording() {
    const recordButton = document.getElementById('record-btn');

    if (!isRecording) {
        // Start recording
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                // Combine audio chunks into a Blob
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                sendAudioToBackend(audioBlob);
            };

            mediaRecorder.start();
            isRecording = true;
            recordButton.innerText = "Ustavi snemanje";
            console.log("Recording started...");
        } catch (error) {
            console.error("Error accessing microphone:", error);
            alert("Could not access the microphone. Please check permissions.");
        }
    } else {
        // Stop recording
        mediaRecorder.stop();
        isRecording = false;
        recordButton.innerText = "Start Recording";
        console.log("Recording stopped...");
    }
}

async function sendAudioToBackend(audioBlob) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recorded_audio.webm');
    formData.append('source', 'Google'); // Add metadata to identify the source

    try {
        const response = await fetch('/recognize', {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();
        if (response.ok) {
            document.getElementById('mic-transcription').innerText =
                `Prepis: ${data.transcription}`;
        } else {
            console.error("Server error:", data.error);
            document.getElementById('mic-transcription').innerText =
                `Error: ${data.error}`;
        }
    } catch (error) {
        console.error("Error sending audio to server:", error);
        alert("Failed to send audio to server.");
    }
}

async function uploadAudio() {
    const audioInput = document.getElementById('audio').files[0];
    const formData = new FormData();
    formData.append('audio', audioInput);

    const response = await fetch('/recognize', { method: 'POST', body: formData });
    const data = await response.json();
    document.getElementById('transcription').innerText = `Transcription: ${data.transcription}`;
}

async function synthesizeText() {
    const text = document.getElementById('text').value;
    const response = await fetch('/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, source: 'Google' }) // Add metadata
    });
    const data = await response.json();

    if (data.audio_file) {
        const audioElement = document.getElementById('synthesis-audio');
        const uniqueUrl = `${data.audio_file}?timestamp=${new Date().getTime()}`;
        audioElement.pause();
        audioElement.src = "";
        audioElement.load();
        audioElement.src = uniqueUrl;
        audioElement.style.display = 'block';
        audioElement.play();
    } else {
        alert("Error synthesizing text: " + data.error);
    }
}

let azureMediaRecorder;
let azureAudioChunks = [];
let isAzureRecording = false;

async function toggleAzureRecording() {
    const azureRecordButton = document.getElementById('azure-record-btn');

    if (!isAzureRecording) {
        // Start Azure recording
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            azureMediaRecorder = new MediaRecorder(stream);
            azureAudioChunks = [];

            azureMediaRecorder.ondataavailable = (event) => {
                azureAudioChunks.push(event.data);
            };

            azureMediaRecorder.onstop = () => {
                // Combine Azure audio chunks into a Blob
                const audioBlob = new Blob(azureAudioChunks, { type: 'audio/webm' });
                sendAzureAudioToBackend(audioBlob);
            };

            azureMediaRecorder.start();
            isAzureRecording = true;
            azureRecordButton.innerText = "Stop Recording";
            console.log("Azure Recording started...");
        } catch (error) {
            console.error("Error accessing microphone:", error);
            alert("Could not access the microphone. Please check permissions.");
        }
    } else {
        // Stop Azure recording
        azureMediaRecorder.stop();
        isAzureRecording = false;
        azureRecordButton.innerText = "Start Recording";
        console.log("Azure Recording stopped...");
    }
}

async function sendAzureAudioToBackend(audioBlob) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'azure_recorded_audio.webm');
    formData.append('source', 'Azure'); // Add metadata to identify the source

    try {
        const response = await fetch('/azure/recognize', {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();
        if (response.ok) {
            document.getElementById('azure-mic-transcription').innerText =
                `Prepis: ${data.transcription}`;
        } else {
            console.error("Server error:", data.error);
            document.getElementById('azure-mic-transcription').innerText =
                `Error: ${data.error}`;
        }
    } catch (error) {
        console.error("Error sending audio to Azure server:", error);
        alert("Failed to send audio to Azure server.");
    }
}

async function uploadAzureAudio() {
    const audioInput = document.getElementById('azure-audio').files[0];
    const formData = new FormData();
    formData.append('audio', audioInput);

    const response = await fetch('/azure/recognize', { method: 'POST', body: formData });
    const data = await response.json();
    document.getElementById('azure-transcription').innerText = `Prepis: ${data.transcription}`;
}

async function synthesizeAzureText() {
    const text = document.getElementById('azure-text').value;
    const response = await fetch('/azure/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, source: 'Azure' }) // Add metadata
    });
    const data = await response.json();

    if (data.audio_file) {
        const audioElement = document.getElementById('azure-synthesis-audio');
        const uniqueUrl = `${data.audio_file}?timestamp=${new Date().getTime()}`;
        audioElement.pause();
        audioElement.src = "";
        audioElement.load();
        audioElement.src = uniqueUrl;
        audioElement.style.display = 'block';
        audioElement.play();
    } else {
        alert("Error synthesizing text: " + data.error);
    }
}

async function submitAndRedirect() {
    const form = document.getElementById('mos-form');
    const formData = new FormData(form);
    const source = new URLSearchParams(window.location.search).get('source');

    try {
        const response = await fetch(form.action, {
            method: 'POST',
            body: formData,
        });

        if (response.ok) {
            // Redirect logic based on the source parameter
            if (source === 'Google') {
                // Redirect to Microsoft Testing after Google Questionnaire
                window.location.href = "/microsoft_testing.html";
            } else if (source === 'Microsoft') {
                // Redirect to Thank You page after Microsoft Questionnaire
                window.location.href = "/thank_you.html";
            } else {
                // Fallback for unknown source
                alert("Unknown source. Please try again.");
            }
        }
    } catch (error) {
        console.error("Submission error:", error);
        alert("Failed to submit the questionnaire.");
    }
}


document.addEventListener("DOMContentLoaded", function () {
    const params = new URLSearchParams(window.location.search);
    const source = params.get("source"); // Get the source query parameter
    const navbarTitle = document.getElementById('navbar-title');

    if (navbarTitle) {
        // Check if the source parameter exists and set the appropriate title
        if (source === "Google") {
            navbarTitle.innerHTML = `<i class="fas fa-microphone-alt"></i> Sinteza in razpoznava govora - Google Vprašalnik`;
        } else if (source === "Microsoft") {
            navbarTitle.innerHTML = `<i class="fas fa-microphone-alt"></i> Sinteza in razpoznava govora - Microsoft Vprašalnik`;
        } else {
            // Fallback to a default title
            navbarTitle.innerHTML = `<i class="fas fa-microphone-alt"></i> Sinteza in razpoznava govora - Vprašalnik`;
        }
    } else {
        console.log("Navbar title element not found!");
    }
});

document.addEventListener("DOMContentLoaded", function () {
    const params = new URLSearchParams(window.location.search);
    const source = params.get('source') || 'Unknown';
    const sourceField = document.getElementById('source-field');

    if (sourceField) {
        sourceField.value = source;
    } else {
        console.log("Source field element not found!");
    }
});

document.addEventListener("DOMContentLoaded", function () {
    // Extract the 'source' parameter from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const source = urlParams.get("source");

    // Set the appropriate URL for the back button
    const backToToolsButton = document.getElementById("back-to-tools");
    if (source === "Google") {
        backToToolsButton.href = "/google_testing.html";
    } else if (source === "Microsoft") {
        backToToolsButton.href = "/microsoft_testing.html";
    }
});

function synthesizePredefinedText(predefinedText) {
    fetch('/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: predefinedText, source: 'Google' }) // Pošlji tekst na strežnik
    })
    .then(response => response.json())
    .then(data => {
        if (data.audio_file) {
            const audioElement = document.getElementById('synthesis-audio');
            const uniqueUrl = `${data.audio_file}?timestamp=${new Date().getTime()}`;
            audioElement.pause();
            audioElement.src = "";
            audioElement.load();
            audioElement.src = uniqueUrl;
            audioElement.style.display = 'block';
            audioElement.play();
        } else {
            alert("Napaka pri sintezi besedila: " + data.error);
        }
    })
    .catch(error => {
        console.error("Napaka pri pošiljanju zahteve za sintezo:", error);
        alert("Napaka pri sintezi besedila.");
    });
}
