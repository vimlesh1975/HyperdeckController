import { useEffect, useState } from "react";

import AudioRecordFormatControls from './AudioRecordFormatControls'
import HyperDeckInfoPage from "./HyperDeckInfoPage";

export default function HyperDeckController() {
  const [status, setStatus] = useState("Idle");
  const [timecode, setTimecode] = useState("00:00:00:00");
  const [clips, setClips] = useState([]);
  const [currentClip, setCurrentClip] = useState(null);
  const [supportedCodecs, setSupportedCodecs] = useState([]);
  const [selectedCodec, setSelectedCodec] = useState("");
  const [currentCodec, setCurrentCodec] = useState("");

  const loadCodecs = () => {
    fetch("http://localhost:4000/api/supported-codecs")
      .then(res => res.json())
      .then(data => {
        console.log("Supported Codecs:", data);
        setSupportedCodecs(data.codecFormats);
      })
      .catch(err => console.error("Error loading codecs:", err));
  };

  const getCurrentcodec = async () => {
    const res = await fetch("http://localhost:4000/api/codec");
    const current = await res.json();
    setCurrentCodec(current)
  }

  // Connect to backend WebSocket
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:4001");
    ws.onopen = () => console.log("Connected to backend WS");
    ws.onmessage = (event) => {
      console.log("WS message received:", event.data);  // 🔹 log raw message
      try {
        const data = JSON.parse(event.data);
        console.log("Parsed data:", data);             // 🔹 log parsed object
        // if (data.stopped && data.stopped===true  ) setStatus('Stopped');

        if (data.playing !== undefined) {
          if (data.playing === true) {
            setStatus("Playing");
          } else {
            setStatus("Stopped");
          }
        }

        if (data.timecode) setTimecode(data.timecode);
        if (data.clipIndex !== undefined) setCurrentClip(data.clipIndex);
      } catch (err) {
        console.error("Failed to parse WS message:", err);
      }
    };
    return () => ws.close();
  }, []);

  const getClips = () => {
    fetch("http://localhost:4000/api/clips")
      .then(res => res.json())
      .then(data => setClips(data.clips || []));
  }
  useEffect(() => {
    getClips();
    loadCodecs();
    getCurrentcodec();

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

  const refreshClips = () => {
    getClips();
  }

  const setInputSource = (source) => {
    fetch("http://localhost:4000/api/input-source", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source })
    })
      .then(res => res.json())
      .then(data => console.log("Set input source:", data))
      .catch(err => console.error("Error setting input source:", err));
  };


  return (
    <>
      <div style={{ padding: "5px" }}>
        <h2>🎬 HyperDeck Controller</h2>
        <p>Status: <b>{status}</b></p>
        <p>Timecode: <b>{timecode}</b></p>
        <button onClick={() => sendCommand("play")}>▶ Play</button>
        <button onClick={() => sendCommand("stop")}>⏹ Stop</button>
        <button onClick={() => sendCommand("record")}>⏺ Record</button>

        <button onClick={() => setInputSource("SDI")}>Use SDI Input</button>
        <button onClick={() => setInputSource("HDMI")} style={{ marginLeft: 8 }}>
          Use HDMI Input
        </button>

        < AudioRecordFormatControls />

      </div>

      <div style={{ padding: "20px" }}>
        <h2>🎬 HyperDeck Clips</h2>
        <button onClick={refreshClips}>Refresh clips</button>
        {<select
          value={selectedCodec}
          onChange={(e) => setSelectedCodec(e.target.value)}
        >
          <option value="">-- Select Codec --</option>

          {supportedCodecs && supportedCodecs.map((val, i) => (
            <option key={i} value={val.codec + '_' + val.container}>
              {val.codec + '_' + val.container}
            </option>
          ))}
        </select>


        }
        <button onClick={() => {
          fetch("http://localhost:4000/api/codec", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ codec: selectedCodec.split("_")[0], container: selectedCodec.split("_")[1] })
          });

        }}>Set Codec Format</button>

        <button onClick={async () => {
          // const res = await fetch("http://localhost:4000/api/codec");
          // const current = await res.json();
          // setCurrentCodec(current)

          getCurrentcodec();

        }}>Get current code</button>
        {'Current code:' + currentCodec?.codecFormat?.codec + "_" + currentCodec?.codecFormat?.container}
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

      <HyperDeckInfoPage />

    </>
  );
}
