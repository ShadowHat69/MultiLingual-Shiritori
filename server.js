const express = require("express");
const cors = require("cors");
const axios = require("axios");
const path = require("path");

const app = express();
app.use(cors());

// Serve static frontend files (index.html, script.js, etc.)
app.use(express.static(path.join(__dirname, "public")));

// Proxy endpoint
app.get("/proxy", async (req, res) => {
    const { url } = req.query;
    if (!url) {
        return res.status(400).json({ error: "URL is required" });
    }

    try {
        const response = await axios.get(url, {
            headers: { "User-Agent": "Mozilla/5.0" }
        });
        res.json(response.data);
    } catch (error) {
        console.error("Error fetching data:", error.message);
        res.status(500).json({ error: "Error fetching the resource", details: error.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
