export class SyncClient {
  handlers = [];
  url = "";
  nodeid = -1;
  status = "disconnected";
  connection = undefined;

  constructor(url, nodeid) {
    this.url = url;
    this.nodeid = nodeid;
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
    });
    this.connection.addEventListener("message", (e) => {
      // console.log("message", e.data);
      if (e.data) {
        const j = JSON.parse(e.data);

        if (j && j.type === "welcome") {
          this.nodeid = j.id;
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
