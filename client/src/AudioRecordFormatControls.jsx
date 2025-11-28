import React, { useState } from "react";

export default function AudioRecordFormatControls() {
    const [currentFormat, setCurrentFormat] = useState(null);
    const [supportedFormats, setSupportedFormats] = useState([]);
    const [selectedFormatId, setSelectedFormatId] = useState("");
    const [message, setMessage] = useState("");

    const API_BASE = "http://localhost:4000";

    // GET current audio record format
    const getCurrentAudioFormat = async () => {
        setMessage("");
        try {
            const res = await fetch(`${API_BASE}/api/audio-record-format`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json(); // { codec, numChannels }
            setCurrentFormat(data);
            setMessage(`Current: ${data.codec} - ${data.numChannels}ch`);
        } catch (err) {
            console.error("Error getting audio format:", err);
            setMessage("Failed to get current audio format");
        }
    };

    // GET supported audio record formats
    const loadSupportedFormats = async () => {
        setMessage("");
        try {
            const res = await fetch(`${API_BASE}/api/audio-supported-record-formats`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            // Expecting: { supportedRecordFormats: [{ format: { codec, numChannels }, available }, ...] }
            const list = (data.supportedRecordFormats || [])
                .filter((item) => item.available !== false) // keep only available
                .map((item) => {
                    const fmt = item.format || {};
                    return {
                        id: `${fmt.codec}|${fmt.numChannels}`,
                        codec: fmt.codec,
                        numChannels: fmt.numChannels,
                    };
                });

            setSupportedFormats(list);
            if (list.length > 0) {
                setSelectedFormatId(list[0].id);
            }
            setMessage(`Loaded ${list.length} audio formats`);
        } catch (err) {
            console.error("Error loading supported audio formats:", err);
            setMessage("Failed to load supported audio formats");
        }
    };

    // POST set audio record format from combo selection
    const setAudioFormat = async () => {
        setMessage("");
        if (!selectedFormatId) {
            setMessage("Select a format first");
            return;
        }

        const [codec, numChannelsStr] = selectedFormatId.split("|");
        const numChannels = Number(numChannelsStr);

        try {
            const res = await fetch(`${API_BASE}/api/audio-record-format`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ codec, numChannels }),
            });
            const data = await res.json();
            if (!res.ok) {
                console.error("Set audio format error:", data);
                setMessage(`Failed to set audio format: ${data.error || "unknown error"}`);
                return;
            }
            setMessage(`Set to: ${codec} - ${numChannels}ch`);
            setCurrentFormat({ codec, numChannels });
        } catch (err) {
            console.error("Error setting audio format:", err);
            setMessage("Failed to set audio format");
        }
    };

    return (
        <div style={{ padding: 10, border: "1px solid #ccc", marginTop: 12 }}>
            <h3>Audio Record Format</h3>

            {/* Buttons for GET and loading supported formats */}
            <div style={{ marginBottom: 8 }}>
                <button onClick={getCurrentAudioFormat}>Get Current Audio Format</button>
                <button onClick={loadSupportedFormats} style={{ marginLeft: 8 }}>
                    Load Supported Audio Formats
                </button>
            </div>

            {/* Combo box after getting supported formats */}
            {supportedFormats.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                    <label>
                        Audio format:
                        <select
                            value={selectedFormatId}
                            onChange={(e) => setSelectedFormatId(e.target.value)}
                            style={{ marginLeft: 8 }}
                        >
                            {supportedFormats.map((fmt) => (
                                <option key={fmt.id} value={fmt.id}>
                                    {fmt.codec} - {fmt.numChannels}ch
                                </option>
                            ))}
                        </select>
                    </label>

                    <button onClick={setAudioFormat} style={{ marginLeft: 8 }}>
                        Set Audio Format
                    </button>
                </div>
            )}

            {/* Show current format info */}
            {currentFormat && (
                <div style={{ marginBottom: 4 }}>
                    Current: <b>{currentFormat.codec}</b> –{" "}
                    <b>{currentFormat.numChannels}</b> channel(s)
                </div>
            )}

            {/* Status message */}
            {message && <div style={{ fontSize: 12, color: "#333" }}>{message}</div>}
        </div>
    );
}
