import React, { useState, useEffect } from "react";

export default function HyperDeckPostExplorer() {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [path, setPath] = useState("");
    const [method, setMethod] = useState("POST");
    const [bodyText, setBodyText] = useState("");
    const [result, setResult] = useState(null);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const API_BASE = "http://localhost:4000";

    // Common POST/PUT endpoints with example bodies
    const actions = [
        {
            label: "Play",
            path: "/transports/0/play",
            method: "POST",
            exampleBody: null,
        },
        {
            label: "Stop",
            path: "/transports/0/stop",
            method: "POST",
            exampleBody: null,
        },
        {
            label: "Record",
            path: "/transports/0/record",
            method: "POST",
            exampleBody: null,
        },
        {
            label: "Clear Timeline 0",
            path: "/timelines/0/clear",
            method: "POST",
            exampleBody: null,
        },
        {
            label: "Set Timeline 0 Clips (example: clip 1)",
            path: "/timelines/0",
            method: "POST",
            exampleBody: { clips: [1] },
        },
        {
            label: "Set Codec Format (DNx HRHQX MXF)",
            path: "/system/codecFormat",
            method: "PUT",
            exampleBody: { codec: "DNx:HRHQX", container: "MXF" },
        },
        {
            label: "Set Input Video Source (SDI)",
            path: "/transports/0/inputVideoSource",
            method: "PUT",
            exampleBody: { inputVideoSource: "SDI" },
        },
        {
            label: "Set Input Video Source (HDMI)",
            path: "/transports/0/inputVideoSource",
            method: "PUT",
            exampleBody: { inputVideoSource: "HDMI" },
        },
    ];

    // initialize from first action
    useEffect(() => {
        const a = actions[0];
        setPath(a.path);
        setMethod(a.method);
        setBodyText(
            a.exampleBody !== null && a.exampleBody !== undefined
                ? JSON.stringify(a.exampleBody, null, 2)
                : ""
        );
    }, []); // run once

    const handleActionChange = (e) => {
        const idx = Number(e.target.value);
        setSelectedIndex(idx);
        const a = actions[idx];
        setPath(a.path);
        setMethod(a.method);
        setResult(null);
        setMessage("");
        setBodyText(
            a.exampleBody !== null && a.exampleBody !== undefined
                ? JSON.stringify(a.exampleBody, null, 2)
                : ""
        );
    };

    const handleSend = async () => {
        setLoading(true);
        setMessage("");
        setResult(null);

        let parsedBody = null;
        if (bodyText.trim().length > 0) {
            try {
                parsedBody = JSON.parse(bodyText);
            } catch (err) {
                setLoading(false);
                setMessage("Body is not valid JSON");
                return;
            }
        }

        try {
            const res = await fetch(`${API_BASE}/api/post-proxy`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    path,
                    method,
                    body: parsedBody,
                }),
            });
            const data = await res.json();
            setResult(data);
            if (!res.ok || !data.ok) {
                setMessage(
                    `Request sent. HyperDeck status: ${data.status ?? res.status}`
                );
            } else {
                setMessage("OK");
            }
        } catch (err) {
            console.error("Error sending POST/PUT:", err);
            setMessage("Error calling backend");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: 16 }}>
            <h2>HyperDeck POST / PUT Explorer</h2>

            {/* Action combo */}
            <div style={{ marginBottom: 8 }}>
                <label>
                    Action:
                    <select
                        value={selectedIndex}
                        onChange={handleActionChange}
                        style={{ marginLeft: 8, minWidth: 280 }}
                    >
                        {actions.map((a, idx) => (
                            <option key={idx} value={idx}>
                                {a.label} ({a.method} {a.path})
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            {/* Path + method (editable if you want to experiment) */}
            <div style={{ marginBottom: 8 }}>
                <label>
                    Path:
                    <input
                        type="text"
                        value={path}
                        onChange={(e) => setPath(e.target.value)}
                        style={{ marginLeft: 8, width: 320 }}
                    />
                </label>

                <label style={{ marginLeft: 8 }}>
                    Method:
                    <select
                        value={method}
                        onChange={(e) => setMethod(e.target.value)}
                        style={{ marginLeft: 4 }}
                    >
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                    </select>
                </label>

                <button
                    onClick={handleSend}
                    disabled={loading}
                    style={{ marginLeft: 8 }}
                >
                    {loading ? "Sending…" : "Send"}
                </button>
            </div>

            {/* Request body editor */}
            <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, marginBottom: 4 }}>Body (JSON, optional):</div>
                <textarea
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    rows={8}
                    style={{ width: "100%", fontFamily: "monospace", fontSize: 12 }}
                    placeholder='{} or leave empty for no body'
                />
            </div>

            {/* Status */}
            {message && (
                <div style={{ marginBottom: 8, fontSize: 12, color: "#333" }}>
                    Status: {message}
                </div>
            )}

            {/* Response */}
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
                        <b>URL:</b> {result.url}
                    </div>
                    <div style={{ marginBottom: 4 }}>
                        <b>Method:</b> {result.method}
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
                    Select an action and click "Send" to see the response.
                </div>
            )}
        </div>
    );
}
