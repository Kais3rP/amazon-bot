import styles from "./styles.module.css";
import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { Row, Col, Container } from "react-bootstrap";
import { saveAs } from "file-saver";
import Loader from "react-loader-spinner";

const homepages = [
  "https://www.amazon.it",
  "https://www.amazon.es",
  "https://www.amazon.de",
  /* "https://www.amazon.co.uk", */
];

const range = {
  "rtx 2060": [200, 500],
  "rtx 2070": [300, 600],
  "rtx 2080": [500, 800],
  "rtx 2080ti": [500, 1000],
  "rtx 3060": [500, 700],
  "rtx 3070": [500, 1200],
  "rtx 3080": [800, 1700],
  "rtx 3090": [1000, 2000],
  /* gtx: [100, 500], */
};

function App() {
  const socketRef = useRef();
  useEffect(() => {
    //init socketio
    socketRef.current = io("http://localhost:3000");
    const socket = socketRef.current;
    socket.on("status-change", onStatusChange);
    socket.on("round", onRoundComplete);
    socket.on("keyword-change", onKeywordChange);
    socket.on("homepage-change", onHomepageChange);
    socket.on("link-bought", onLinkBought);
    socket.on("error", onError);
    socket.on("logs", onLogsRetrieved);
    socket.on("abort", onAbort);
  }, []);
  // SOCKET LISTENING EVENTS

  const [isActive, setIsActive] = useState(false);
  const [isAborting, setIsAborting] = useState(false);
  const [counter, setCounter] = useState(0);
  const [keywords, setKeywords] = useState([]);
  const [status, setStatus] = useState("");
  const [itemFound, setItemFound] = useState(null);
  const [currentHomepage, setCurrentHomepage] = useState("");
  const [itemsBought, setItemsBought] = useState([]);

  //HANDLERS

  async function onSubmit(e) {
    e.preventDefault();
    setIsActive(true);
    const data = [...new FormData(e.target).entries()];
    const homepages = data
      .slice(0, 3)
      .filter((el) => el[1] === "on")
      .map((el) => el[0]);
    const range = data.slice(3, data.length);
    console.log(homepages, range);
    socketRef.current.emit("start", {
      homepages,
      range,
    });
  }

  async function socketStop() {
    console.log("STOP CLICKED");
    socketRef.current.emit("abort");
    setIsAborting(true);
    //isActive is set to falseonly when asynchronously receiving the abort message from server
  }

  async function onStatusChange(data) {
    setStatus(data);
  }

  async function onRoundComplete(data) {
    setKeywords([]);
    setCounter(data);
  }

  async function onKeywordChange(data) {
    setKeywords((keys) => [...keys, data]);
  }

  async function onHomepageChange(data) {
    setKeywords([]);
    setCurrentHomepage(data);
  }

  async function onLinkBought(data) {
    setItemsBought((items) => [...items, data]);
    setItemFound(data);
  }

  async function onError() {
    setCurrentHomepage("Error");
    setItemFound("Error");
    setKeywords("Error");
    setCounter("Error");
    setStatus("Error");
    setIsActive(false);
  }

  async function onLogsRetrieved(data) {
    console.log("LOGS:", data);
    const file = new Blob([new Uint8Array(data)]);
    console.log(file);
    saveAs(file, "log.txt");
  }
  async function retrieveLogs() {
    socketRef.current.emit("retrieve-logs");
  }

  function onAbort() {
    setIsActive(false);
    setIsAborting(false);
    setItemsBought([]);
    setItemFound("");
  }

  return (
    <Container fluid className={styles.container}>
      <Row>
        <Col>
          {isAborting ? (
            <>
              <Loader
                type="Puff"
                color="#00BFFF"
                height={100}
                width={100}
                timeout={20000} //3 secs
              />
              "Aborting..."
            </>
          ) : (
            <>
              {" "}
              <h1>Amazon Crawler</h1>
              {!isActive ? (
                <form onSubmit={onSubmit}>
                  <Row>
                    <Col>
                      {homepages.map((homepage) => (
                        <Row className={styles.homepageContainer}>
                          <Col>
                            <label>
                              {homepage}
                              <input
                                name={homepage}
                                type={"checkbox"}
                                defaultChecked
                              />
                            </label>
                          </Col>
                        </Row>
                      ))}
                      <Row>
                        <Col>
                          <h2>Keyword:</h2>
                        </Col>
                        <Col>
                          <h2>Price: min - max</h2>
                        </Col>
                      </Row>
                      {Object.entries(range).map((field) => (
                        <Row className={styles.fieldContainer}>
                          <Col>
                            {" "}
                            <h4>{field[0]}</h4>
                          </Col>
                          <Col>
                            {" "}
                            <input
                              type="text"
                              name={field[0]}
                              defaultValue={`${field[1][0]}-${field[1][1]}`}
                            />
                          </Col>
                        </Row>
                      ))}
                    </Col>
                  </Row>

                  <button type="submit">START CRAWL</button>
                </form>
              ) : (
                <>
                  <div>
                    <h3> Status:</h3>
                    {status}
                  </div>
                  <div>
                    <h3> Crawl Round:</h3>
                    {counter}
                  </div>
                  <div>
                    <h3> Searching on:</h3>
                    {currentHomepage}
                  </div>
                  <div>
                    <h3> Searching Keywords:</h3>
                    {keywords}
                  </div>
                  <div>
                    <h3> Item Found:</h3>
                    {itemFound}
                  </div>
                  <div>
                    <h3>Items Bought:</h3>
                    {itemsBought}
                  </div>

                  <button onClick={retrieveLogs}>Download Logs</button>
                  <button onClick={socketStop}>STOP CRAWL</button>
                </>
              )}
            </>
          )}
        </Col>
      </Row>
    </Container>
  );
}

export default App;
