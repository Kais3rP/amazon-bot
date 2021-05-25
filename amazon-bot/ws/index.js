const Crawler = require("../core");
const { readFile, readdir, writeFile } = require("fs/promises");
const path = require("path");

function initIo(server) {
  const io = require("socket.io")(server, {
    cors: {
      origin: "http://localhost:3001",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("CLIENT CONNECTED");
    let globalState = false;

    //## START EVENT

    socket.on("start", async (data) => {
      const { homepages, range } = data;
      console.log(homepages, range);
      //BUILDING THE RANGE OBJECT
      const _range = {};
      range.forEach((el) => {
        _range[el[0]] = el[1].split("-").map((n) => +n);
      });

      //INIT GLOBAL VARIABLES TO SEND TO THE CLIENT

      let counter = 0;
      globalState = true;

      try {
        /* await launchMultipleHomepageCrawl(homepages); */
        while (globalState) {
          counter++;
          socket.emit("round", counter);

          //THIS STARTS THE CRAWLING

          await launchSequentialHomepageCrawl(homepages, _range, socket);
          console.log(
            `ROUND ${counter} OF CRAWLING ENDED: ${new Date().toLocaleString()}`
          );
          if (!globalState) socket.emit("abort");
        }
      } catch (e) {
        console.log("CAUGHT A GLOBAL ERROR \n, reason:\n" + e + "\n" + e.stack);
        socket.emit("error");
      }
    });

    //## DISCONNECT EVENT
    socket.on("disconnect", (reason) => {
      globalState = false;
    });

    //## ABORT EVENT
    socket.on("abort", async (data) => {
      console.log("**ABORTING CRAWL**");
      globalState = false;
    });

    //## RETRIEVE LOGS EVENT

    socket.on("retrieve-logs", async (range) => {
      console.log("RETRIEVING LOGS...");
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
      socket.emit("logs", finalFile);
    });

    // FUNCTIONS

    const startCrawl = async (homepage, range, socket) => {
      const crawler = new Crawler(homepage, range, socket);
      await crawler.crawl();
    };

    const launchSequentialHomepageCrawl = async (homepages, range, socket) => {
      for (const homepage of homepages) {
        if (!globalState) break;
        await startCrawl(homepage, range, socket);
      }
    };
  });
}

/* const launchMultipleHomepageCrawl = async (homepages, range) => {
  await Promise.all(homepages.map((homepage) => startCrawl(homepage, range)));
}; */

module.exports = initIo;
