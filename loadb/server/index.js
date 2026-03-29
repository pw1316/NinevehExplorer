//@ts-check
const express = require("express");
const cors = require("cors");
const http = require("http");

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("./public"));

app.get("/", (req, res) => {
    res.render("index.html");
});

http.createServer(app).listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
});
