import React, { useState } from "react";

export default function HyperDeckGetExplorer() {
    const [selectedPath, setSelectedPath] = useState("/system/product");
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const API_BASE = "http://localhost:4000";

    // List of useful GET endpoints (HyperDeck REST paths)
    const endpoints = [
        { label: "System Product", path: "/system/product" },
        { label: "System Codec Format", path: "/system/codecFormat" },
        { label: "System Supported Video Formats", path: "/system/supportedVideoFormats" },
        { label: "System Video Format (current)", path: "/system/videoFormat" },
        { label: "Timeline 0 (clips)", path: "/timelines/0" },
        { label: "Timeline 0 Default Video Format", path: "/timelines/0/defaultVideoFormat" },
        { label: "Timeline 0 Video Format (current)", path: "/timelines/0/videoFormat" },
        { label: "Media Active", path: "/media/active" },
        { label: "Media Workingset", path: "/media/workingset" },
        { label: "Transports 0 (summary)", path: "/transports/0" },
        { label: "Transport 0 Clip Index", path: "/transports/0/clipIndex" },
        { label: "Transport 0 Input Video Format", path: "/transports/0/inputVideoFormat" },
        { label: "Transport 0 Input Video Source", path: "/transports/0/inputVideoSource" },
        { label: "Transport 0 Timecode", path: "/transports/0/timecode" },
        { label: "Transport 0 Timecode Source", path: "/transports/0/timecode/source" },
        { label: "Clips", path: "/clips" },
    ];

    const handleChange = async (e) => {
        const path = e.target.value;
        setSelectedPath(path);
        await loadPath(path);
    };

    const loadPath = async (path) => {
        setLoading(true);
        setMessage("");
        setResult(null);
        try {
            const res = await fetch(
                `${API_BASE}/api/get-proxy?path=${encodeURIComponent(path)}`
            );
            const data = await res.json();
            setResult(data);

            if (!res.ok || !data.ok) {
                setMessage(
                    `Request failed. HTTP status from HyperDeck: ${data.status ?? res.status}`
                );
            } else {
                setMessage("OK");
            }
        } catch (err) {
            console.error("Error loading path:", err);
            setMessage("Error calling backend");
        } finally {
            setLoading(false);
        }
    };

    // Optional: button to reload same path
    const handleReload = () => {
        loadPath(selectedPath);
    };

    return (
        <div style={{ padding: 16 }}>
            <h2>HyperDeck GET Explorer</h2>

            <div style={{ marginBottom: 8 }}>
                <label>
                    Endpoint:
                    <select
                        value={selectedPath}
                        onChange={handleChange}
                        style={{ marginLeft: 8, minWidth: 260 }}
                    >
                        {endpoints.map((ep) => (
                            <option key={ep.path} value={ep.path}>
                                {ep.label} ({ep.path})
                            </option>
                        ))}
                    </select>
                </label>

                <button
                    onClick={handleReload}
                    disabled={loading}
                    style={{ marginLeft: 8 }}
                >
                    {loading ? "Loading…" : "Reload"}
                </button>
            </div>

            {/* Show status / message */}
            {message && (
                <div style={{ marginBottom: 8, fontSize: 12, color: "#333" }}>
                    Status: {message}
                </div>
            )}

            {/* Show result */}
            {result && (
                <div
                    style={{
                        marginTop: 8,
                        border: "1px solid #ddd",
                        borderRadius: 4,
                        padding: 8,
                        fontFamily: "monospace",
                        fontSize: 12,
                        whiteSpace: "pre-wrap",
                        background: "#fafafa",
                    }}
                >
                    <div style={{ marginBottom: 4 }}>
                        <b>Requested URL:</b> {result.url}
                    </div>
                    <div style={{ marginBottom: 4 }}>
                        <b>HTTP Status:</b> {result.status} (ok: {String(result.ok)})
                    </div>
                    <div>
                        <b>Body:</b>
                    </div>
                    <pre style={{ margin: 0 }}>
                        {JSON.stringify(result.body, null, 2)}
                    </pre>
                </div>
            )}

            {!result && !loading && (
                <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
                    Select an endpoint to see its response.
                </div>
            )}
        </div>
    );
}
