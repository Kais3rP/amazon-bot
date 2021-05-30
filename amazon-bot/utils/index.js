function normalizePort(val) {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

function formatDate(date) {
  return date.toLocaleDateString().replace(/\//g, "-");
}

module.exports = {
  normalizePort,
  formatDate,
};
