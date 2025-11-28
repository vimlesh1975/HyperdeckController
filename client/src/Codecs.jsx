import React, { useState } from "react";

export default function SupportedCodecCombo() {
  const [codecList, setCodecList] = useState([]);
  const [selectedCodec, setSelectedCodec] = useState("");

  const loadCodecs = async () => {
    try {
      const res = await fetch("http://localhost:4000/api/supported-codecs");
      const data = await res.json();

      // Find the actual supportedCodecFormats object
      const codecs =
        data.supportedCodecFormats ??
        data["/system/supportedCodecFormats"] ??
        data;

      // Extract codec families (keys only)
      // Example keys: ["h264", "prores", "dnx"]
      const keys = Object.keys(codecs);

      setCodecList(keys);
    } catch (err) {
      console.error("Error loading codecs:", err);
    }
  };

  return (
    <div style={{ padding: 10 }}>
      <h3>Supported Codec Formats</h3>

      <button onClick={loadCodecs}>Load Codecs</button>

      <br /><br />

      <select
        value={selectedCodec}
        onChange={(e) => setSelectedCodec(e.target.value)}
      >
        <option value="">-- Select Codec --</option>

        {codecList.map((codec) => (
          <option key={codec} value={codec}>
            {codec}
          </option>
        ))}
      </select>

      {selectedCodec && (
        <p>
          Selected Codec: <b>{selectedCodec}</b>
        </p>
      )}
    </div>
  );
}
