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

// Set input video source: body: { "source": "sdi" } or { "source": "hdmi" }
app.post("/api/input-source", async (req, res) => {
  try {
    const { source } = req.body;

    // you can adjust allowed values based on your model: "sdi", "hdmi", "component", "composite", etc.
    const allowed = ["SDI", "HDMI"];
    if (!source || !allowed.includes(source)) {
      return res.status(400).json({
        error: "Invalid or missing source. Allowed values: " + allowed.join(", ")
      });
    }

    const response = await fetch(`${BASE_URL}/transports/0/inputVideoSource`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputVideoSource: source })
      // Some firmwares may expect just { "source": "sdi" } or { "value": "sdi" }.
      // If this body doesn't work, try changing the key, but keep the route logic same.
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return res.status(500).json({
        error: `HyperDeck returned ${response.status}`,
        details: text,
      });
    }

    res.json({ status: "ok", inputVideoSource: source });
  } catch (err) {
    console.error("Error setting input source:", err);
    res.status(500).json({ error: err.message });
  }
});


app.get("/api/system-info", async (req, res) => {
  try {
    // We’ll call multiple HyperDeck REST endpoints in parallel
    const urls = {
      product: `${BASE_URL}/system/product`,
      codecFormat: `${BASE_URL}/system/codecFormat`,
      supportedVideoFormats: `${BASE_URL}/system/supportedVideoFormats`,
      videoFormat: `${BASE_URL}/system/videoFormat`,
      defaultTimelineFormat: `${BASE_URL}/timelines/0/defaultVideoFormat`,
      timelineFormat: `${BASE_URL}/timelines/0/videoFormat`,
      mediaActive: `${BASE_URL}/media/active`,
      mediaWorkingset: `${BASE_URL}/media/workingset`,
      transport: `${BASE_URL}/transports/0`,
      inputVideoSource: `${BASE_URL}/transports/0/inputVideoSource`,
      timecode: `${BASE_URL}/transports/0/timecode`,
    };

    const entries = await Promise.all(
      Object.entries(urls).map(async ([key, url]) => {
        try {
          const resp = await fetch(url);
          const text = await resp.text(); // sometimes 204/no body
          if (!resp.ok) {
            return [key, { error: true, status: resp.status, text }];
          }
          // try parse JSON, else return raw text
          let json;
          try {
            json = text ? JSON.parse(text) : null;
          } catch {
            json = text || null;
          }
          return [key, json];
        } catch (e) {
          return [key, { error: true, message: e.message }];
        }
      })
    );

    const result = Object.fromEntries(entries);
    res.json(result);
  } catch (err) {
    console.error("Error fetching system info:", err);
    res.status(500).json({ error: err.message });
  }
});


app.get("/api/audio-supported-record-formats", async (req, res) => {
  try {
    const url = `${BASE_URL}/audio/supportedRecordFormats`;
    console.log("→ GET", url);

    const response = await fetch(url);

    const text = await response.text(); // read raw text always
    console.log("HyperDeck /audio/supportedRecordFormats =", response.status, text);

    if (!response.ok) {
      // forward real error from HyperDeck instead of generic 500
      return res
        .status(response.status)
        .json({ error: `HyperDeck HTTP ${response.status}`, details: text });
    }

    // if OK, parse JSON from text
    const data = JSON.parse(text);
    res.json(data);
  } catch (err) {
    console.error("Error fetching supported audio formats:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get current record audio format (codec + channels currently set)
app.get("/api/audio-record-format", async (req, res) => {
  try {
    const response = await fetch(`${BASE_URL}/audio/recordFormat`);
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return res
        .status(500)
        .json({ error: `HyperDeck returned ${response.status}`, details: text });
    }
    const data = await response.json();
    // { codec: "PCM", numChannels: 16 }
    res.json(data);
  } catch (err) {
    console.error("Error fetching record audio format:", err);
    res.status(500).json({ error: err.message });
  }
});

// Set record audio format (this is where you choose numChannels)
app.post("/api/audio-record-format", async (req, res) => {
  try {
    const { codec, numChannels } = req.body;

    if (!codec || typeof numChannels !== "number") {
      return res
        .status(400)
        .json({ error: "codec and numChannels are required" });
    }

    const body = { codec, numChannels };

    const response = await fetch(`${BASE_URL}/audio/recordFormat`, {
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

    res.json({ status: "ok", set: body });
  } catch (err) {
    console.error("Error setting record audio format:", err);
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

// Generic GET proxy for HyperDeck REST paths
// Example: /api/get-proxy?path=/system/product
app.get("/api/get-proxy", async (req, res) => {
  try {
    const path = req.query.path;

    if (!path || typeof path !== "string") {
      return res.status(400).json({ error: "Query parameter 'path' is required" });
    }

    if (!path.startsWith("/")) {
      return res
        .status(400)
        .json({ error: "Path must start with '/'. Example: /system/product" });
    }

    const url = `${BASE_URL}${path}`;
    console.log("→ GET proxy:", url);

    const response = await fetch(url);
    const text = await response.text(); // read as text first

    let body;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text || null; // not JSON, just return raw text
    }

    res.json({
      url,
      status: response.status,
      ok: response.ok,
      body,
    });
  } catch (err) {
    console.error("Error in /api/get-proxy:", err);
    res.status(500).json({ error: err.message });
  }
});
// Generic POST/PUT proxy for HyperDeck REST paths
// Client sends: { path: "/system/codecFormat", method: "PUT", body: { ... } }
app.post("/api/post-proxy", async (req, res) => {
  try {
    const { path, method = "POST", body } = req.body || {};

    if (!path || typeof path !== "string") {
      return res.status(400).json({ error: "Field 'path' is required" });
    }

    if (!path.startsWith("/")) {
      return res
        .status(400)
        .json({ error: "Path must start with '/'. Example: /transports/0/play" });
    }

    const upperMethod = String(method).toUpperCase();
    const allowedMethods = ["POST", "PUT"];
    if (!allowedMethods.includes(upperMethod)) {
      return res
        .status(400)
        .json({ error: "Method must be POST or PUT", method: upperMethod });
    }

    const url = `${BASE_URL}${path}`;
    console.log("→", upperMethod, "proxy:", url, "body:", body);

    const fetchOptions = {
      method: upperMethod,
      headers: {},
    };

    // attach JSON body if provided
    if (body !== undefined && body !== null) {
      fetchOptions.headers["Content-Type"] = "application/json";
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    const text = await response.text(); // HyperDeck often returns 204/empty

    let parsed;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text || null;
    }

    res.json({
      url,
      method: upperMethod,
      status: response.status,
      ok: response.ok,
      body: parsed,
    });
  } catch (err) {
    console.error("Error in /api/post-proxy:", err);
    res.status(500).json({ error: err.message });
  }
});


hyperdeckWs.on("message", (msg) => {
  const data = JSON.parse(msg.toString());
  // console.log("HD EVENT:", JSON.stringify(data, null, 2));

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
