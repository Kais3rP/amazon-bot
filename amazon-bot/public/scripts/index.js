const form = document.querySelector("form");
const stopBtn = document.querySelector("#stop-btn");
const logsBtn = document.querySelector("#logs");
const statusDiv = document.querySelector("#status");
const roundCounterDiv = document.querySelector("#round-counter");
const homepageDiv = document.querySelector("#homepage");
const keywordsDiv = document.querySelector("#keywords");
const matchDiv = document.querySelector("#match");
const linkDiv = document.querySelector("#link");

//CONNECT TO WEBSOCKET
const socket = io();

// SOCKET LISTENING EVENTS

socket.on("status-change", onStatusChange);
socket.on("round", onRoundComplete);
socket.on("keyword-change", onKeywordChange);
socket.on("homepage-change", onHomepageChange);
socket.on("link-bought", onLinkBought);
socket.on("error", onError);

const itemsBought = [];
let keywords = [];

//DOM EVENT LISTENERS

form.onsubmit = socketCall;

stopBtn.onclick = socketStop;

logsBtn.onclick = retrieveLogs;

//HANDLERS

async function socketCall(e) {
  e.preventDefault();
  const data = [...new FormData(e.target).entries()];
  const homepages = data
    .slice(0, 3)
    .filter((el) => el[1] === "on")
    .map((el) => el[0]);
  const range = data.slice(3, data.length);
  console.log(homepages, range);
  socket.emit("start", {
    homepages,
    range,
  });
}

async function socketStop() {
  console.log("STOP CLICKED");
  socket.emit("abort");
}

async function onStatusChange(data) {
  statusDiv.innerText = data;
}

async function onRoundComplete(data) {
  keywords = [];
  roundCounterDiv.innerText = data;
}

async function onKeywordChange(data) {
  keywords.push(data);
  keywordsDiv.innerText = keywords;
}

async function onHomepageChange(data) {
  keywords = [];
  homepageDiv.innerText = data;
}

async function onLinkBought(data) {
  itemsBought.push(data);
  linkDiv.innerText = itemsBought;
}

async function onError() {
  homepageDiv.innerText = "Error";
  linkDiv.innerText = "Error";
  keywordsDiv.innerText = "Error";
  roundCounterDiv.innerText = "Error";
  statusDiv.innerText = "Error";
}

async function retrieveLogs() {
  window.location  = "/logs"
  /*  const data = await res.json();
  console.log("DATA", data); */
}

/* async function restCall(e) {
  const range = [...new FormData(e.target).entries()];
  console.log(...range);
  const res = await fetch("/search/crawl", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      homepages,
      range,
    }),
  });
  const _data = await res.json();
  console.log("START RES:", _data);
}

async function restStop() {
  const res = await fetch("/search/stop");
  const _data = await res.json();
  console.log("STOP RES:", _data);
} */
