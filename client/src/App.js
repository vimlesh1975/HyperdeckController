import React, { useEffect, useState } from "react";

export default function HyperDeckController() {
  const [status, setStatus] = useState("Idle");
  const [timecode, setTimecode] = useState("00:00:00:00");
  const [clips, setClips] = useState([]);
  const [currentClip, setCurrentClip] = useState(null);

  // Connect to backend WebSocket
useEffect(() => {
  const ws = new WebSocket("ws://localhost:4001");
  ws.onopen = () => console.log("Connected to backend WS");
  ws.onmessage = (event) => {
    console.log("WS message received:", event.data);  // 🔹 log raw message
    try {
      const data = JSON.parse(event.data);
      console.log("Parsed data:", data);             // 🔹 log parsed object
      if (data.status) setStatus(data.status);
      if (data.timecode) setTimecode(data.timecode);
      if (data.clipIndex !== undefined) setCurrentClip(data.clipIndex);
    } catch (err) {
      console.error("Failed to parse WS message:", err);
    }
  };
  return () => ws.close();
}, []);


  // Fetch clips
  useEffect(() => {
    fetch("http://localhost:4000/api/clips")
      .then(res => res.json())
      .then(data => setClips(data.clips || []));
  }, []);

  const sendCommand = (cmd) => {
    fetch(`http://localhost:4000/api/${cmd}`, { method: "POST" });
  };

  const playClip = (clipId) => {
    fetch(`http://localhost:4000/api/play/${clipId}`, { method: "POST" })
      .then(res => res.json())
      .then(data => console.log("Playing clip:", data))
      .catch(err => console.error("Error playing clip:", err));
  };

  const cell = { border: "1px solid #ddd", padding: "8px", textAlign: "center" };

  return (
    <>
      <div style={{ padding: "5px" }}>
        <h2>🎬 HyperDeck Controller</h2>
        <p>Status: <b>{status}</b></p>
        <p>Timecode: <b>{timecode}</b></p>
        <button onClick={() => sendCommand("play")}>▶ Play</button>
        <button onClick={() => sendCommand("stop")}>⏹ Stop</button>
        <button onClick={() => sendCommand("record")}>⏺ Record</button>
      </div>

      <div style={{ padding: "20px" }}>
        <h2>🎬 HyperDeck Clips</h2>
        <table style={{ borderCollapse: "collapse", width: "100%", marginTop: "10px" }}>
          <thead>
            <tr style={{ backgroundColor: "#f2f2f2" }}>
              {["ID", "File", "Codec", "Container", "Start TC", "Duration", "Resolution", "Frame Rate", "File Size (MB)", "Action"].map(h => (
                <th key={h} style={cell}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clips.map((clip) => {
              const isPlaying = clip.clipUniqueId === currentClip;
              return (
                <tr key={clip.clipUniqueId} style={{ backgroundColor: isPlaying ? "#d1ffd1" : "transparent" }}>
                  <td style={cell}>{clip.clipUniqueId}</td>
                  <td style={cell}>{clip.filePath}</td>
                  <td style={cell}>{clip.codecFormat?.codec}</td>
                  <td style={cell}>{clip.codecFormat?.container}</td>
                  <td style={cell}>{clip.startTimecode}</td>
                  <td style={cell}>{clip.durationTimecode}</td>
                  <td style={cell}>{clip.videoFormat?.width}x{clip.videoFormat?.height}</td>
                  <td style={cell}>{clip.videoFormat?.frameRate ?? "N/A"} fps</td>
                  <td style={cell}>{(clip.fileSize ? clip.fileSize / (1024 * 1024) : 0).toFixed(1)}</td>
                  <td style={cell}>
                    <button onClick={() => playClip(clip.clipUniqueId)}>▶ Play</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
