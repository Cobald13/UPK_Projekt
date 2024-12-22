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
            recordButton.innerText = "Stop Recording";
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
    // Prepare FormData to send the recorded audio
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recorded_audio.webm');

    try {
        // Send to the Flask backend (Google Speech Recognition example)
        const response = await fetch('/recognize', {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();
        if (response.ok) {
            document.getElementById('mic-transcription').innerText =
                `Transcription: ${data.transcription}`;
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
        body: JSON.stringify({ text })
    });
    const data = await response.json();

    if (data.audio_file) {
        const audioElement = document.getElementById('synthesis-audio');
        const uniqueUrl = `${data.audio_file}?timestamp=${new Date().getTime()}`; // Add unique timestamp
        audioElement.pause(); // Stop the current playback if it's playing
        audioElement.src = ""; // Clear the current source
        audioElement.load(); // Reload the audio element
        audioElement.src = uniqueUrl; // Set the new source with a unique URL
        audioElement.style.display = 'block'; // Make the audio player visible
        audioElement.play(); // Start playing the new audio
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
    // Prepare FormData to send the recorded audio
    const formData = new FormData();
    formData.append('audio', audioBlob, 'azure_recorded_audio.webm');

    try {
        // Send to the Flask backend (Azure Speech Recognition endpoint)
        const response = await fetch('/azure/recognize', {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();
        if (response.ok) {
            document.getElementById('azure-mic-transcription').innerText =
                `Azure Transcription: ${data.transcription}`;
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
    document.getElementById('azure-transcription').innerText = `Azure Transcription: ${data.transcription}`;
}

async function synthesizeAzureText() {
    const text = document.getElementById('azure-text').value;
    const response = await fetch('/azure/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
    });
    const data = await response.json();

    if (data.audio_file) {
        const audioElement = document.getElementById('azure-synthesis-audio');
        const uniqueUrl = `${data.audio_file}?timestamp=${new Date().getTime()}`; // Add unique timestamp
        audioElement.pause(); // Stop the current playback if it's playing
        audioElement.src = ""; // Clear the current source
        audioElement.load(); // Reload the audio element
        audioElement.src = uniqueUrl; // Set the new source with a unique URL
        audioElement.style.display = 'block'; // Make the audio player visible
        audioElement.play(); // Start playing the new audio
    } else {
        alert("Error synthesizing text: " + data.error);
    }
}