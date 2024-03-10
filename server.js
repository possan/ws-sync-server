import express from "express";
import expressWs from "express-ws";
import cors from "cors";
import * as uuid from "uuid";

const PORT = process.env.PORT || 3000;

const app = express();
const appWithWS = expressWs(app);

app.use(cors());
app.use(express.static("static"));

var wss = appWithWS.getWss();

function broadcast(message, channel) {
  // console.log("broadcast", channel, message);
  wss.clients.forEach(function (client) {
    // console.log("  client @channel ", client._channel);
    if (client._channel === channel) {
      client.send(message);
    }
  });
}

app.ws("/broadcast", function (ws, req) {
  let nodeid = -1;
  let channel = "default";
  const id = uuid.v4();

  console.log("connected", channel, id);

  ws._channel = channel;

  ws.send(
    JSON.stringify({
      type: "welcome",
      channel,
      id,
    })
  );

  ws.on("message", function (msg) {
    // console.log("got message", msg);
    const decoded = JSON.parse(msg);
    if (decoded && decoded.type === "hello" && decoded.node) {
      nodeid = decoded.node;
    }
    decoded.channel = channel;
    decoded.id = id;
    broadcast(JSON.stringify(decoded), channel);
  });

  ws.on("close", () => {
    console.log("disconnect", channel, id, nodeid);
    broadcast(
      JSON.stringify({
        type: "disconnect",
        node: nodeid,
        channel,
        id,
      }),
      channel
    );
  });
});

app.ws("/broadcast/:channel", function (ws, req) {
  let nodeid = -1;
  let channel = req.params.channel;
  const id = uuid.v4();

  console.log("connected", channel, id);

  ws._channel = channel;

  ws.send(
    JSON.stringify({
      type: "welcome",
      channel,
      id,
    })
  );

  ws.on("message", function (msg) {
    // console.log("got message", msg);
    const decoded = JSON.parse(msg);
    if (decoded && decoded.type === "hello") {
      nodeid = decoded.node;
    }
    decoded.channel = channel;
    decoded.id = id;
    broadcast(JSON.stringify(decoded), channel);
  });

  ws.on("close", () => {
    console.log("disconnect", channel, id, nodeid);
    broadcast(
      JSON.stringify({
        type: "disconnect",
        node: nodeid,
        channel,
        id,
      }),
      channel
    );
  });
});

app.listen(PORT, function () {
  console.log(`web server listening on port ${PORT}`);
});
