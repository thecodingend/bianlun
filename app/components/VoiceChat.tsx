"use client";

import { useState, useRef, useEffect } from "react";

export default function VoiceChat() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<string>("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Request microphone permission on component mount
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .catch((err) => console.error("Microphone access denied:", err));
  }, []);

  // Helper function to convert audio blob to WAV format
  const convertToWav = async (blob: Blob): Promise<Blob> => {
    const audioContext = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Create WAV file
    const length = audioBuffer.length * audioBuffer.numberOfChannels * 2;
    const buffer = new ArrayBuffer(44 + length);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + length, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, audioBuffer.numberOfChannels, true);
    view.setUint32(24, audioBuffer.sampleRate, true);
    view.setUint32(
      28,
      audioBuffer.sampleRate * 2 * audioBuffer.numberOfChannels,
      true
    );
    view.setUint16(32, audioBuffer.numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, length, true);

    // Convert audio data
    const channelData = audioBuffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < channelData.length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample * 0x7fff, true);
      offset += 2;
    }

    return new Blob([buffer], { type: "audio/wav" });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          sampleSize: 16,
        },
      });

      // Try multiple formats in order of preference
      const supportedFormats = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ];

      let mimeType = "audio/webm"; // default
      for (const format of supportedFormats) {
        if (MediaRecorder.isTypeSupported(format)) {
          mimeType = format;
          break;
        }
      }

      console.log("Recording with format:", mimeType);

      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeType,
        });

        // Convert to WAV format for Gemini compatibility
        try {
          const wavBlob = await convertToWav(audioBlob);
          await processAudio(wavBlob);
        } catch (conversionError) {
          console.error("Error converting to WAV:", conversionError);
          // Fallback: try sending original format
          await processAudio(audioBlob);
        }

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Could not start recording. Please check microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.wav");
      if (conversationId) {
        formData.append("conversationId", conversationId);
      }

      const response = await fetch("/api/voice", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        throw new Error(errorData.details || "Failed to process audio");
      }

      const data = await response.json();

      // Update conversation ID
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      // Update last response text
      setLastResponse(data.textResponse);

      // Play audio response
      if (data.audioResponse) {
        const audioFormat = data.audioFormat || "mp3"; // Default to mp3 for backward compatibility
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audioResponse), (c) => c.charCodeAt(0))],
          { type: `audio/${audioFormat}` }
        );
        const audioUrl = URL.createObjectURL(audioBlob);

        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.play();
        }
      }
    } catch (error) {
      console.error("Error processing audio:", error);
      alert(
        `Failed to process audio: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const resetConversation = () => {
    setConversationId(null);
    setLastResponse("");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
            AI Voice Chat
          </h1>

          {/* Status Display */}
          <div className="mb-8 p-4 bg-gray-100 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">
              Status:{" "}
              {isRecording
                ? "Recording..."
                : isProcessing
                ? "Processing..."
                : "Ready"}
            </p>
            {conversationId && (
              <p className="text-xs text-gray-500">
                Conversation ID: {conversationId}
              </p>
            )}
          </div>

          {/* Last Response Display */}
          {lastResponse && (
            <div className="mb-8 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                AI Response:
              </h3>
              <p className="text-gray-800">{lastResponse}</p>
            </div>
          )}

          {/* Record Button */}
          <div className="flex flex-col items-center space-y-4">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              className={`
                relative w-32 h-32 rounded-full transition-all duration-300
                ${
                  isRecording
                    ? "bg-red-500 hover:bg-red-600 animate-pulse"
                    : "bg-blue-500 hover:bg-blue-600"
                }
                ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}
                text-white shadow-lg hover:shadow-xl
                focus:outline-none focus:ring-4 focus:ring-blue-300
              `}
            >
              <div className="flex flex-col items-center justify-center h-full">
                {isRecording ? (
                  <>
                    <svg
                      className="w-12 h-12 mb-2"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </svg>
                    <span className="text-sm font-medium">Stop</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-12 h-12 mb-2"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3z" />
                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                    </svg>
                    <span className="text-sm font-medium">Record</span>
                  </>
                )}
              </div>
            </button>

            {conversationId && (
              <button
                onClick={resetConversation}
                className="text-sm text-gray-600 hover:text-gray-800 underline"
              >
                Start New Conversation
              </button>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-8 text-center text-sm text-gray-600">
            <p>Press and release the button to record your voice</p>
            <p>The AI will respond with both text and voice</p>
          </div>
        </div>
      </div>

      {/* Hidden audio element for playback */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
