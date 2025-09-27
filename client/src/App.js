import React, { useEffect, useState } from "react";

export default function HyperDeckController() {
  const [status, setStatus] = useState("Idle");
  const [timecode, setTimecode] = useState("00:00:00:00");
  const [clips, setClips] = useState([]);
  // Connect to backend WebSocket
  // useEffect(() => {
  //   const ws = new WebSocket("ws://localhost:4001"); // backend WS
  //   ws.onmessage = (event) => {
  //     const data = JSON.parse(event.data);
  //     console.log("Event from backend:", data);

  //     if (data.type === "transport") {
  //       setStatus(data.state);
  //     }
  //     if (data.type === "timecode") {
  //       setTimecode(data.timecode);
  //     }
  //   };
  //   return () => ws.close();
  // }, []);

  // Call backend REST API


  const cell = {
  border: "1px solid #ddd",
  padding: "8px",
  textAlign: "center",
};
  const sendCommand = (cmd) => {
    fetch(`http://localhost:4000/api/${cmd}`, { method: "POST" });
  };


  
  useEffect(() => {
    fetch("http://localhost:4000/api/clips")
      .then(res => res.json())
      .then(data => setClips(data.clips || []));
  }, []);
  const playClip = (clipId) => {
    fetch(`http://localhost:4000/api/play/${clipId}`, { method: "POST" })
      .then(res => res.json())
      .then(data => console.log("Playing clip:", data))
      .catch(err => console.error("Error playing clip:", err));
  };
  return (<>
    <div style={{ padding: "5px" }}>
      <h2>🎬 HyperDeck Controller</h2>
      <p>Status: <b>{status}</b></p>
      <p>Timecode: <b>{timecode}</b></p>
      <button onClick={() => sendCommand("play")}>▶ Play</button>
      <button onClick={() => sendCommand("stop")}>⏹ Stop</button>
      <button onClick={() => sendCommand("record")}>⏺ Record</button>
    </div>

     <div>
        <div style={{ padding: "20px" }}>
      <h2>🎬 HyperDeck Clips</h2>
      <table
        style={{
          borderCollapse: "collapse",
          width: "100%",
          marginTop: "10px",
        }}
      >
        <thead>
          <tr style={{ backgroundColor: "#f2f2f2" }}>
            <th style={cell}>ID</th>
            <th style={cell}>File</th>
            <th style={cell}>Codec</th>
            <th style={cell}>Container</th>
            <th style={cell}>Start TC</th>
            <th style={cell}>Duration</th>
            <th style={cell}>Resolution</th>
            <th style={cell}>Frame Rate</th>
            <th style={cell}>File Size (MB)</th>
              <th style={cell}>Action</th>
          </tr>
        </thead>
        <tbody>
          {clips.map((clip) => (
            <tr key={clip.clipUniqueId}>
              <td style={cell}>{clip.clipUniqueId}</td>
              <td style={cell}>{clip.filePath}</td>
              <td style={cell}>{clip.codecFormat?.codec}</td>
              <td style={cell}>{clip.codecFormat?.container}</td>
              <td style={cell}>{clip.startTimecode}</td>
              <td style={cell}>{clip.durationTimecode}</td>

              <td style={cell}>
                {clip.videoFormat?.width}x{clip.videoFormat?.height}
              </td>
              <td style={cell}>{clip.videoFormat?.frameRate} fps</td>
              <td style={cell}>
                {(clip.fileSize / (1024 * 1024)).toFixed(1)}
              </td>
               <td style={cell}>
                <button onClick={() => playClip(clip.clipUniqueId)}>
                  ▶ Play
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  
    </div>
  </>);
}
