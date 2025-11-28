import express from "express";
import fetch from "node-fetch";
import { WebSocketServer } from "ws";
import WebSocket from "ws";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

const HYPERDECK_IP = "192.168.173.200";
const BASE_URL = `http://${HYPERDECK_IP}/control/api/v1`;

// WebSocket server for React
const wss = new WebSocketServer({ port: 4001 });
wss.on("connection", ws => {
  console.log("React client connected to backend WebSocket");
});

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}

// REST proxy routes
app.post("/api/play", async (req, res) => {
  await fetch(`${BASE_URL}/transports/0/play`, { method: "POST" });
  res.send({ status: "ok" });
});

app.post("/api/stop", async (req, res) => {
  await fetch(`${BASE_URL}/transports/0/stop`, { method: "POST" });
  res.send({ status: "ok" });
});

app.post("/api/record", async (req, res) => {
  await fetch(`${BASE_URL}/transports/0/record`, { method: "POST" });
  res.send({ status: "ok" });
});

app.get("/api/clips", async (req, res) => {
  try {
    const response = await fetch(`${BASE_URL}/clips`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/supported-codecs", async (req, res) => {
  try {
    const response = await fetch(`${BASE_URL}/system/supportedCodecFormats`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Error fetching codec formats:", err);
    res.status(500).json({ error: err.message });
  }
});

//
// 🔹 NEW: get current codec format
//
app.get("/api/codec", async (req, res) => {
  try {
    const response = await fetch(`${BASE_URL}/system/codecFormat`);
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return res.status(500).json({
        error: `HyperDeck returned ${response.status}`,
        details: text,
      });
    }
    const data = await response.json();
    res.json(data); // e.g. { codec: "ProRes:HQ", container: "MOV" }
  } catch (err) {
    console.error("Error fetching current codec:", err);
    res.status(500).json({ error: err.message });
  }
});

//
// 🔹 NEW: set current recording codec
// body: { "codec": "ProRes:HQ", "container": "MOV" }
// container is optional; depends on your workflow
//
app.post("/api/codec", async (req, res) => {
  try {
    const { codec, container } = req.body;

    if (!codec) {
      return res.status(400).json({ error: "codec is required" });
    }

    const body = container ? { codec, container } : { codec };

    const response = await fetch(`${BASE_URL}/system/codecFormat`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return res.status(500).json({
        error: `HyperDeck returned ${response.status}`,
        details: text,
      });
    }

    // HyperDeck usually returns 204 No Content on success
    res.json({ status: "ok", set: body });
  } catch (err) {
    console.error("Error setting codec format:", err);
    res.status(500).json({ error: err.message });
  }
});

// Play a specific clip via timeline
app.post("/api/play/:clipId", async (req, res) => {
  const clipId = parseInt(req.params.clipId, 10);
  try {
    await fetch(`${BASE_URL}/timelines/0/clear`, { method: "POST" });
    await new Promise(r => setTimeout(r, 100)); // small delay
    await fetch(`${BASE_URL}/timelines/0`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clips: [clipId] })
    });
    await fetch(`${BASE_URL}/transports/0/play`, { method: "POST" });
    res.json({ status: "playing", clipId });
  } catch (err) {
    console.error("Error playing clip:", err);
    res.status(500).json({ error: err.message });
  }
});

// HyperDeck WebSocket subscription
const hyperdeckWs = new WebSocket(`ws://${HYPERDECK_IP}/control/api/v1/event/websocket`);

hyperdeckWs.on("open", () => {
  console.log("Connected to HyperDeck WS ✅");

  const subscribeMsg = {
    type: "request",
    data: {
      action: "subscribe",
      properties: [
        "/media/active",
        "/media/external",
        "/media/external/selected",
        "/media/nas/bookmarks",
        "/media/nas/discovered",
        "/media/workingset",
        "/system",
        "/system/codecFormat",
        "/system/product",
        "/system/supportedVideoFormats",
        "/system/videoFormat",
        "/timelines/0",
        "/timelines/0/defaultVideoFormat",
        "/timelines/0/videoFormat",
        "/transports/0",
        "/transports/0/clipIndex",
        "/transports/0/inputVideoFormat",
        "/transports/0/inputVideoSource",
        "/transports/0/play",
        "/transports/0/playback",
        "/transports/0/record",
        "/transports/0/stop",
        "/transports/0/timecode",
        "/transports/0/timecode/source"
      ]
    }
  };

  hyperdeckWs.send(JSON.stringify(subscribeMsg));
});

hyperdeckWs.on("message", (msg) => {
  const data = JSON.parse(msg.toString());

  if (data.data?.property) {
    let broadcastData = {};

    switch (data.data.property) {
      case "/transports/0/timecode":
        broadcastData.timecode = data.data.value.display;
        break;

      case "/transports/0/play":
        broadcastData.playing = data.data.value;
        break;

      case "/transports/0/stop":
        broadcastData.stopped = data.data.value;
        break;

      case "/transports/0/clipIndex":
        broadcastData.clipIndex = data.data.value;
        break;

      case "/system/codecFormat":
        // if you want, you can also broadcast codec changes live to React
        broadcastData.codecFormat = data.data.value;
        break;

      default:
        return; // ignore other updates for now
    }

    if (Object.keys(broadcastData).length > 0) {
      broadcast(broadcastData);
    }
  }
});

hyperdeckWs.on("error", (err) => console.error("HyperDeck WS error:", err.message));
hyperdeckWs.on("close", () => console.log("HyperDeck WS closed ❌"));

app.listen(4000, () => console.log("Backend running on http://localhost:4000"));
