import styles from "./styles.module.css";
import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { Row, Col, Container } from "react-bootstrap";
import { saveAs } from "file-saver";
import Loader from "react-loader-spinner";
import { IoLogoEuro } from "react-icons/io";

const beURL = "http://localhost:3000";

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
  const abortTimeoutRef = useRef(null);

  // SOCKET LISTENING EVENTS

  const [isActive, setIsActive] = useState(false);
  const [isAborting, setIsAborting] = useState(false);
  const [counter, setCounter] = useState(0);
  const [keywords, setKeywords] = useState([]);
  const [status, setStatus] = useState("");
  const [itemFound, setItemFound] = useState(null);
  const [currentHomepage, setCurrentHomepage] = useState("");
  const [itemsBought, setItemsBought] = useState([]);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    //init socketio
    socketRef.current = io(beURL);
    const socket = socketRef.current;
    socket.on("status-change", onStatusChange);
    socket.on("round", onRoundComplete);
    socket.on("keyword-change", onKeywordChange);
    socket.on("homepage-change", onHomepageChange);
    socket.on("link-bought", onLinkBought);
    socket.on("error", onError);
    socket.on("logs", onLogsRetrieved);
    socket.on("abort", onAbort);

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (!isActive) {
      setItemFound(null);
      setItemsBought([]);
    }
  }, [isActive]);

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
    abortTimeoutRef.current = setTimeout(() => {
      setIsActive(false);
      setIsAborting(false);
    }, 15000);
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
  async function onRetrieveLogsSubmit(e) {
    e.preventDefault();
    console.log([...new FormData(e.target)]);
    const data = [...new FormData(e.target)];
    const range = [data[0][1], data[1][1]];
    socketRef.current.emit("retrieve-logs", range);
  }

  function onAbort() {
    clearTimeout(abortTimeoutRef.current);
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
            <Row>
              <Col
                style={{ height: "100vh" }}
                className="d-flex justify-content-center align-items-center"
                xs={12}
              >
                <Loader
                  type="Puff"
                  color="#00BFFF"
                  height={100}
                  width={100}
                  timeout={20000} //3 secs
                />
                <h5>"Aborting..."</h5>
              </Col>
            </Row>
          ) : (
            <>
              {!isActive ? (
                <form onSubmit={onSubmit}>
                  <Row>
                    <Col xs={12} className={styles.line}></Col>
                    <Col xs={6} className={styles.logoContainer}>
                      <h1>Amazon Crawler</h1>
                      <img
                        className={styles.logo}
                        style={{ width: "85px", marginTop: "-1px" }}
                        src="/amazon.png"
                        alt="logo"
                      />
                    </Col>
                    <Col xs={6} className={styles.homepageContainer}>
                      {homepages.map((homepage) => (
                        <Row>
                          <Col xs={12} className="d-flex align-items-center">
                            <label className="">{homepage}</label>
                            <input
                              className={styles.checkBox}
                              name={homepage}
                              type={"checkbox"}
                              defaultChecked
                            />
                          </Col>
                        </Row>
                      ))}
                    </Col>
                    <Col xs={12} className={styles.line}></Col>
                    <Col className="d-flex flex-column justify-content-center align-items-center">
                      <Row>
                        {Object.entries(range).map((field) => (
                          <Col
                            onMouseEnter={() => setShowTooltip(field[0])}
                            onMouseLeave={() => setShowTooltip(null)}
                            xs={12}
                            className={styles.fieldContainer}
                          >
                            <div>
                              <h4 className={styles.keyword}>{field[0]}</h4>
                              <span className={styles.currency}>
                                <IoLogoEuro />
                              </span>
                              {showTooltip === field[0] && (
                                <span className={styles.format}>
                                  ( <u>Format:</u> xxx-yyy )
                                </span>
                              )}
                              <input
                                className={styles.price}
                                type="text"
                                name={field[0]}
                                defaultValue={`${field[1][0]}-${field[1][1]}`}
                              />
                            </div>
                          </Col>
                        ))}
                        <Col
                          xs={12}
                          className="d-flex flex-column justify-content-center align-items-center"
                        >
                          {" "}
                          <button className={styles.start} type="submit">
                            START CRAWL
                          </button>
                        </Col>
                      </Row>
                    </Col>
                  </Row>
                </form>
              ) : (
                <>
                  <Row>
                    <Col xs={12} className={styles.line}></Col>
                    <Col xs={6} className={styles.logoContainer}>
                      <h1>Amazon Crawler</h1>
                      <img
                        className={styles.logo}
                        style={{ width: "85px", marginTop: "-1px" }}
                        src="/amazon.png"
                        alt="logo"
                      />
                    </Col>
                    <Col xs={12} className={styles.line}></Col>
                    <Col xs={12}>
                      <div className="d-flex align-items-center">
                        <h3> Status:</h3>
                        <Load />
                      </div>

                      {status}
                    </Col>

                    <Col xs={12}>
                      <div className="d-flex align-items-center">
                        <h3> Crawl Round:</h3>
                        <Load />
                      </div>
                      {counter}
                    </Col>
                    <Col xs={12}>
                      <div className="d-flex align-items-center">
                        <h3> Searching on:</h3>
                        <Load />
                      </div>
                      {currentHomepage}
                    </Col>
                    <Col xs={12}>
                      <div className="d-flex align-items-center">
                        <h3> Searching Keywords:</h3>
                        <Load />
                      </div>
                      {keywords}
                    </Col>
                    <Col xs={12}>
                      <div className="d-flex align-items-center">
                        <h3> Item Found:</h3>
                        <Load />
                      </div>
                      <a href={itemFound} target="_blank" rel="noreferrer">
                        {itemFound}
                      </a>
                    </Col>
                    <Col xs={12}>
                      <div className="d-flex align-items-center">
                        <h3>Items Bought:</h3>
                        <Load />
                      </div>
                      {itemsBought.map((href) => (
                        <a href={href} target="_blank" rel="noreferrer">
                          {href}
                        </a>
                      ))}
                    </Col>
                    <Col xs={12}>
                      <Row>
                        <Col>
                          <form onSubmit={onRetrieveLogsSubmit}>
                            <input name="start-date" type="date" />
                            <input name="end-date" type="date" />
                            <button type="submit">Download Logs</button>
                          </form>
                        </Col>
                      </Row>

                      <button onClick={socketStop}>STOP CRAWL</button>
                    </Col>
                  </Row>
                </>
              )}
            </>
          )}
        </Col>
      </Row>
    </Container>
  );
}

function Load() {
  return <div className={styles.load}></div>;
}

export default App;

/* function formatDate(date) {
  return new Date(date).toLocaleDateString("it-IT").replace(/\//g, "-");
} */
