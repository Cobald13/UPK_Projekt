from datetime import datetime
from flask import Flask, request, jsonify, render_template, redirect
from flask_pymongo import PyMongo
from google.cloud import speech, texttospeech
import azure.cognitiveservices.speech as speechsdk
from pydub import AudioSegment
import os
import io
from dotenv import load_dotenv

app = Flask(__name__)

load_dotenv()  # Load environment variables from .env

# Set sensitive credentials from environment variables
GOOGLE_APPLICATION_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
MONGO_URI = os.getenv("MONGO_URI")
AZURE_SPEECH_KEY = os.getenv("AZURE_SPEECH_KEY")
AZURE_REGION = os.getenv("AZURE_REGION")

# Initialize Google clients
speech_client = speech.SpeechClient()
tts_client = texttospeech.TextToSpeechClient()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/test-db', methods=['GET'])
def test_db():
    try:
        # Insert a test document into the 'test' collection
        mongo.test.insert_one({"message": "Hello, MongoDB!"})
        return "Database connection successful! Test document inserted."
    except Exception as e:
        return f"Error connecting to MongoDB: {e}"


@app.route('/recognize', methods=['POST'])
def recognize_speech():
    try:
        if 'audio' not in request.files:
            print("No audio file found in the request")
            return jsonify({"error": "No audio file provided"}), 400

        audio_file = request.files['audio']
        print(f"Uploaded file content type: {audio_file.content_type}")
        audio_content = audio_file.read()

        # Save original audio for debugging
        original_audio_path = "uploaded_audio.webm"
        with open(original_audio_path, "wb") as f:
            f.write(audio_content)
        print(f"Original audio saved as: {original_audio_path}")

        # Convert WebM/Opus to 48kHz WAV (LINEAR16 with 16-bit depth)
        if audio_file.content_type == "audio/webm":
            print("Converting WebM/Opus to 48kHz WAV...")
            audio = AudioSegment.from_file(io.BytesIO(audio_content), format="webm")
            audio = audio.set_frame_rate(48000).set_channels(1).set_sample_width(2)  # 16-bit = 2 bytes

            # Save converted audio for debugging
            converted_audio_path = "converted_audio.wav"
            audio.export(converted_audio_path, format="wav", parameters=["-acodec", "pcm_s16le"])
            print(f"Converted audio saved as: {converted_audio_path}")

            # Prepare the audio content for Google API
            wav_io = io.BytesIO()
            audio.export(wav_io, format="wav", parameters=["-acodec", "pcm_s16le"])
            audio_content = wav_io.getvalue()

        # Configure Google Speech-to-Text API for Slovenian
        audio = speech.RecognitionAudio(content=audio_content)
        config = speech.RecognitionConfig(
            language_code="sl-SI",  # Slovenian
            sample_rate_hertz=48000,  # 48kHz to match converted audio
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,  # LINEAR16 encoding
            enable_automatic_punctuation=True,
        )

        print("Sending audio to Google Speech-to-Text...")
        response = speech_client.recognize(config=config, audio=audio)

        # Check the response
        if not response.results:
            print("No transcription received from Google Speech-to-Text.")
            return jsonify({"transcription": "No transcription available. Please try again with a clear audio file."})

        # Return the transcript
        transcript = response.results[0].alternatives[0].transcript
        print(f"Google Slovenian Transcription: {transcript}")
        return jsonify({"transcription": transcript})

    except Exception as e:
        print(f"Error during Speech-to-Text processing: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/synthesize', methods=['POST'])
def synthesize_speech():
    data = request.json
    if not data or 'text' not in data:
        return jsonify({"error": "No text provided"}), 400

    text = data['text']

    # Configure Google Text-to-Speech API
    input_text = texttospeech.SynthesisInput(text=text)
    voice = texttospeech.VoiceSelectionParams(
        language_code="en-US",  # Replace with desired language code, e.g., "sl-SI"
        ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL,
    )
    audio_config = texttospeech.AudioConfig(audio_encoding=texttospeech.AudioEncoding.LINEAR16)

    try:
        response = tts_client.synthesize_speech(input=input_text, voice=voice, audio_config=audio_config)

        # Save the audio file as WAV
        audio_file_path = "static/output.wav"  # Use .wav to reflect LINEAR16 encoding
        with open(audio_file_path, "wb") as out:
            out.write(response.audio_content)

        return jsonify({"audio_file": audio_file_path})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/azure/recognize', methods=['POST'])
def azure_recognize_speech():
    try:
        if 'audio' not in request.files:
            print("No audio file provided")
            return jsonify({"error": "No audio file provided"}), 400

        audio_file = request.files['audio']
        print(f"Received file: {audio_file.filename}, Content-Type: {audio_file.content_type}")

        # Read the WebM audio file
        audio_content = audio_file.read()

        # Convert WebM to WAV
        print("Converting WebM to 16-bit PCM WAV...")
        audio = AudioSegment.from_file(io.BytesIO(audio_content), format="webm")
        audio = audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)  # 16kHz, mono, 16-bit
        wav_io = io.BytesIO()
        audio.export(wav_io, format="wav")
        wav_io.seek(0)

        # Save the converted file for debugging
        with open("azure_converted_audio.wav", "wb") as f:
            f.write(wav_io.read())
        print("Converted audio saved as azure_converted_audio.wav")

        # Configure Azure Speech SDK
        speech_config = speechsdk.SpeechConfig(subscription=AZURE_SPEECH_KEY, region=AZURE_REGION)
        speech_config.speech_recognition_language = "sl-SI"  # Slovenian

        # Prepare audio input from the converted WAV file
        audio_input = speechsdk.audio.AudioConfig(filename="azure_converted_audio.wav")
        speech_recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_input)

        print("Starting Azure speech recognition...")
        result = speech_recognizer.recognize_once()

        # Process the recognition result
        if result.reason == speechsdk.ResultReason.RecognizedSpeech:
            print(f"Azure Transcription: {result.text}")
            return jsonify({"transcription": result.text})
        elif result.reason == speechsdk.ResultReason.NoMatch:
            print("No speech could be recognized.")
            return jsonify({"transcription": "No speech could be recognized."})
        else:
            print(f"Azure Recognition failed: {result.reason}")
            return jsonify({"error": str(result.reason)})

    except Exception as e:
        print(f"Error occurred: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/azure/synthesize', methods=['POST'])
def azure_synthesize_speech():
    try:
        data = request.json
        if not data or 'text' not in data:
            return jsonify({"error": "No text provided"}), 400

        text = data['text']
        
        # Configure Azure Speech SDK
        speech_config = speechsdk.SpeechConfig(subscription=AZURE_SPEECH_KEY, region=AZURE_REGION)
        speech_config.speech_synthesis_voice_name = "sl-SI-RokNeural"  # Replace with a desired voice

        # Output audio configuration
        audio_path = "static/azure_output.wav"
        audio_config = speechsdk.audio.AudioOutputConfig(filename=audio_path)

        # Synthesize text to speech
        synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=audio_config)
        result = synthesizer.speak_text_async(text).get()

        if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
            return jsonify({"audio_file": audio_path})
        else:
            return jsonify({"error": f"Speech synthesis failed: {result.reason}"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/submit-mos', methods=['POST'])
def submit_mos():
    try:
        # Extract form data
        mos_data = {
            "q1": int(request.form['q1']),
            "q2": int(request.form['q2']),
            "q3": int(request.form['q3']),
            "q4": int(request.form['q4']),
            "q5": int(request.form['q5']),
            "q6": int(request.form['q6']),
            "q7": int(request.form['q7']),
            "timestamp": datetime.now()
        }

        # Insert into the 'mos_feedback' collection
        mongo.mos_feedback.insert_one(mos_data)
        print("MOS feedback saved:", mos_data)

        # Redirect to the thank-you page
        return redirect('/thank-you')
    except Exception as e:
        print(f"Error saving MOS feedback: {e}")
        return jsonify({"error": str(e)}), 500



@app.route('/questionnaire', methods=['GET'])
def questionnaire():
    return render_template('questionnaire.html')

@app.route('/thank-you', methods=['GET'])
def thank_you():
    return render_template('thank_you.html')


if __name__ == "__main__":
    app.run(debug=True)
