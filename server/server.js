import express from "express";
import fetch from "node-fetch";
import { WebSocketServer } from "ws";
import WebSocket from "ws";
import cors from "cors";   // ✅ import cors

const app = express();
app.use(express.json());
app.use(cors());  // ✅ allow all origins (or configure specific ones)

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
    if (client.readyState === 1) client.send(msg);
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

// HyperDeck WebSocket events
// const hyperdeckWs = new WebSocket(`ws://${HYPERDECK_IP}/control/api/v1/websocket`);

// hyperdeckWs.on("open", () => console.log("Connected to HyperDeck WebSocket"));
// hyperdeckWs.on("message", msg => {
//   const data = JSON.parse(msg.toString());
//   console.log("HyperDeck event:", data);
//   broadcast(data);
// });

app.get("/api/clips", async (req, res) => {
  try {
    const response = await fetch(`${BASE_URL}/clips`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/play/:clipId", async (req, res) => {
  const clipId = parseInt(req.params.clipId, 10);

  try {
    var aa;

    // Step 1: Clear timeline
    aa= await fetch(`${BASE_URL}/timelines/0/clear`, { method: "POST" });
    // console.log(aa)

    // Step 2: Add clip
    aa= await fetch(`${BASE_URL}/timelines/0`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clips: [clipId] })
    });
    // console.log(aa)

    // Step 3: Play
    aa= await fetch(`${BASE_URL}/transports/0/play`, { method: "POST" });
    // console.log(aa)

    res.json({ status: "playing", clipId });
  } catch (err) {
    console.error("Error playing clip:", err);
    res.status(500).json({ error: err.message });
  }
});



app.listen(4000, () =>
  console.log("Backend running on http://localhost:4000")
);
