const express = require("express");
const multer = require("multer");

const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath(ffmpegPath);
const path = require("path");

const fs = require("fs");
const app = express();
const PORT = 3000;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage }).single("video");

app.post("/upload", upload, (req, res) => {
  if (!req.file || path.extname(req.file.originalname) !== ".mov") {
    return res.status(400).send("Ошибка: загружен не MOV файл.");
  }

  const outputFilePath = `converted/${Date.now()}-${path.basename(
    req.file.originalname,
    ".mov"
  )}.mp4`;

  ffmpeg(req.file.path)
    .output(outputFilePath)
    .on("end", () => {
      fs.unlinkSync(req.file.path);
      res.json({
        downloadUrl: `http://localhost:${PORT}/download/${path.basename(
          outputFilePath
        )}`,
      });
    })
    .on("error", (err) => {
      res.status(500).send("Ошибка конвертации: " + err.message);
    })
    .run();
});

app.get("/download/:filename", (req, res) => {
  const filePath = path.join(__dirname, "converted", req.params.filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath, (err) => {
      if (err) {
        return res.status(500).send("Ошибка скачивания: " + err.message);
      }

      fs.unlinkSync(filePath);
    });
  } else {
    res.status(404).send("Файл не найден.");
  }
});

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
if (!fs.existsSync("converted")) fs.mkdirSync("converted");

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
