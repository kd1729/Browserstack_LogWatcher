const events = require("events");
const fs = require("fs");
const watchFile = "test.log";
const bf = require('buffer');
const TRAILING_LINES = 10;
const buffer = Buffer.alloc(bf.constants.MAX_STRING_LENGTH);

class Watcher extends events.EventEmitter {
  constructor(watchFile) {
    super();
    this.watchFile = watchFile;
    this.store = [];
  }

  getLogs() {
    return this.store;
  }

  watch(curr, prev) {
    const watcher = this;
    // Only process changes between previous and current size of the file (new logs)
    const newSize = curr.size - prev.size;

    if (newSize <= 0) {
      // No new data added or log file reset (truncated)
      return;
    }

    fs.open(this.watchFile, (err, fd) => {
      if (err) throw err;
      let data = '';
      let logs = [];
      // Read only the new data appended to the file
      fs.read(fd, buffer, 0, newSize, prev.size, (err, bytesRead) => {
        if (err) throw err;
        if (bytesRead > 0) {
          data = buffer.slice(0, bytesRead).toString();
          logs = data.split("\n").filter(line => line.trim() !== ''); // Filter out empty lines
          console.log("logs read: " + logs);

          // Add new logs and ensure the store contains only the last 10 lines
          logs.forEach((log) => {
            this.store.push(log);
            if (this.store.length > TRAILING_LINES) {
              this.store.shift(); // Remove the oldest line if store exceeds 10 lines
            }
          });

          watcher.emit("process", logs);
        }
        fs.close(fd);
      });
    });
  }

  start() {
    const watcher = this;
    fs.open(this.watchFile, (err, fd) => {
      if (err) throw err;
      let data = '';
      let logs = [];
      // Read the entire file initially to get the last 10 lines
      fs.read(fd, buffer, 0, buffer.length, 0, (err, bytesRead) => {
        if (err) throw err;
        if (bytesRead > 0) {
          data = buffer.slice(0, bytesRead).toString();
          logs = data.split("\n").filter(line => line.trim() !== ''); // Filter out empty lines
          this.store = [];

          // Only store the last 10 lines from the file initially
          logs.slice(-TRAILING_LINES).forEach((log) => this.store.push(log));
        }
        fs.close(fd);
      });

      // Watch for changes in the file and call `watch` on modifications
      fs.watchFile(this.watchFile, { interval: 2000 }, function (curr, prev) {
        watcher.watch(curr, prev);
      });
    });
  }
}

module.exports = Watcher;
