const express = require("express");
const path = require("path");

const app = express();
const port = process.env.PORT || 10000;

app.use(express.static(path.join(__dirname, "public"), {
  acceptRanges: true,
  cacheControl: false
}));

app.get("/", (_req, res) => {
  res.send(`
    <h2>Video streaming test — Oregon, USA</h2>
    <video width="1280" controls autoplay>
      <source src="/test.mp4" type="video/mp4">
    </video>
  `);
});

app.listen(port, "0.0.0.0", () => {
  console.log("Server running on port", port);
});