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

const highRange = {
  "rtx 2060": [200, 800],
  "rtx 2070": [300, 1000],
  "rtx 2080": [500, 1200],
  "rtx 2080ti": [500, 1500],
  "rtx 3060": [500, 1500],
  "rtx 3070": [500, 1700],
  "rtx 3080": [800, 200],
  "rtx 3090": [1000, 2500],
  /*  gtx: [100, 1000],
  "ryzen 3600": [100, 500], */
};

const fields = [
  "rtx 2060",
  "rtx 2070",
  "rtx 2080",
  "rtx 2080ti",
  "rtx 3060",
  "rtx 3070",
  "rtx 3080",
  "rtx 3090",
];

module.exports = {
  homepages,
  range,
  highRange,
  fields,
};
