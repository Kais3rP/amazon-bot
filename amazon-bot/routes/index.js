const express = require("express");
const router = express.Router();
const { readFile, readdir, writeFile } = require("fs/promises");
const path = require("path");
const { range, homepages } = require("../data");

/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("index", { title: "Express", range, homepages });
});

router.get("/logs", async function (req, res, next) {
  try {
    console.log("RETRIEVING LOGS");
    const dir = path.join(process.cwd(), "logs");
    //GET ALL THE LOGS REQUESTED
    const fileNames = await readdir(dir);
    const files = [];
    for (const name of fileNames) {
      const file = await readFile(path.join(dir, name));
      files.push(file);
    }
    const finalFile = Buffer.concat(files);
    //WRITE THE BUFFER TO A FILE
    const filePath = path.join(
      dir,
      `${new Date().toLocaleDateString().replace(/\//g, "-")}.txt`
    );
    await writeFile(filePath, finalFile);
    console.log("PATH", filePath);
    res.download(filePath, (e) => console.log(e));
  } catch (e) {
    console.log(e, e.stack);
  }
});

module.exports = router;
