export class SyncClient {
  handlers = [];
  url = "";
  nodeid = -1;
  status = "disconnected";
  connection = undefined;
  _latencykeys = [];
  _latencies = [];
  averagelatency = 0.0;

  constructor(url, nodeid) {
    this.url = url;
    this.nodeid = nodeid;
  }

  _sendLatencyCheck() {
    const key = Date.now() + "-" + Math.round(Math.random() * 1000000);
    this._latencykeys.push(key);
    // console.log("new latencykey", key);
    this.send({
      type: ".latencyprobe",
      key: key,
      start: typeof performance !== undefined ? performance.now() : Date.now(),
    });
  }

  _checkRoundtripLatency() {
    this._latencies = [];
    this._latencykeys = [];
    for (var k = 0; k < 10; k++) {
      setTimeout(
        this._sendLatencyCheck.bind(this),
        300 + Math.random() * 200 + k * 300
      );
    }
  }

  _handleLatencyProbe(m) {
    if (this._latencykeys.indexOf(m.key) === -1) {
      // skipping someone elses probe
      return;
    }
    const now =
      typeof performance !== undefined ? performance.now() : Date.now();
    const roundtrip = now - m.start;
    // console.log("got latency probe response", m, roundtrip);
    this._latencies.push(roundtrip);
    const tot = this._latencies.reduce((p, c, i) => p + c, 0);
    const avg = tot / this._latencies.length;
    console.log(`average latency: ${avg}ms`, this._latencies);
    this.averagelatency = avg;
    this._fire({
      type: ".averagelatency",
      value: this.averagelatency,
    });
  }

  connect() {
    // status = 'connecting'
    if (this.connection) {
      this.connection.close();
      this.connection = undefined;
    }

    this.connection = new WebSocket(this.url);
    this.connection.addEventListener("open", () => {
      console.log("connected.");
      this.send({
        type: "hello",
        node: this.nodeid,
      });

      setTimeout(() => {
        this._checkRoundtripLatency();
      }, 1000);
    });

    this.connection.addEventListener("message", (e) => {
      // console.log("message", e.data);
      if (e.data) {
        const j = JSON.parse(e.data);

        if (j && j.type === ".welcome") {
          this.nodeid = j.id;
        }

        if (j && j.type === ".latencyprobe") {
          this._handleLatencyProbe(j);
        }

        this._fire(j);
      }
    });
  }

  send(message) {
    this.connection.send(JSON.stringify(message));
  }

  _fire(event) {
    for (const handler of this.handlers) {
      handler(event);
    }
  }

  subscribe(handler) {
    this.handlers.push(handler);
  }
}
