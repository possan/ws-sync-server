import express from "express";
import expressWs from "express-ws";
import cors from "cors";
import * as uuid from "uuid";

const PORT = process.env.PORT || 3000;
const channelmetrics = {};
const app = express();
const appWithWS = expressWs(app);

app.use(cors());
app.use(express.static("static"));

var wss = appWithWS.getWss();

function broadcast(message, channel) {
  // console.log("broadcast", channel, message);
  wss.clients.forEach(function (client) {
    // console.log("  client @channel ", client._channel);
    if (client._channel === channel || channel === undefined) {
      client.send(message);
    }
  });
}

setInterval(() => {
  // broadcast some stats
  let channels = [];
  let counter = 0;
  let channelcounter = {};

  wss.clients.forEach(function (client) {
    const channel = client._channel;

    if (channels.indexOf(channel) === -1) {
      channels.push(channel);
    }

    counter++;

    if (channelcounter[channel] !== undefined) {
      channelcounter[channel] += 1;
    } else {
      channelcounter[channel] = 1;
    }
  });

  // console.log("channels", channels, counter);
  channels = channels.map((c) => {
    return {
      id: c,
      metrics: channelmetrics[c],
      connections: channelcounter[c] || 0,
    };
  });

  broadcast(
    JSON.stringify({
      type: ".stats",
      clients: counter,
      channels,
    }),
    undefined
  );
}, 3000);

// app.ws("/broadcast", function (ws, req) {
//   let nodeid = -1;
//   let channel = "default";
//   const id = uuid.v4();

//   console.log("connected", channel, id);

//   ws._channel = channel;

//   ws.send(
//     JSON.stringify({
//       type: "_welcome",
//       _channel: channel,
//       _id: id,
//     })
//   );

//   ws.on("message", function (msg) {
//     // console.log("got message", msg);
//     const decoded = JSON.parse(msg);
//     if (decoded && decoded.type === ".hello" && decoded.node) {
//       nodeid = decoded.node;
//     }
//     decoded._channel = channel;
//     decoded._id = id;

//     if (channel) {
//       broadcast(JSON.stringify(decoded), channel);

//       let metric = channelmetrics[channel];
//       if (!metric) {
//         metric = {};
//         metric.lastseen = Date.now();
//         metric.events = 1;
//         channelmetrics[channel] = metric;
//       } else {
//         metric.lastseen = Date.now();
//         metric.events++;
//       }
//     }
//   });

//   ws.on("close", () => {
//     console.log("disconnect", channel, id, nodeid);
//     broadcast(
//       JSON.stringify({
//         type: ".disconnect",
//         _node: nodeid,
//         _channel: channel,
//         _id: id,
//       }),
//       channel
//     );
//   });
// });

app.ws("/broadcast/:channel", function (ws, req) {
  let nodeid = -1;
  let channel = req.params.channel;
  const id = uuid.v4();

  console.log("connected", channel, id);

  ws._channel = channel;

  ws.send(
    JSON.stringify({
      type: ".welcome",
      _channel: channel,
      _id: id,
    })
  );

  ws.on("message", function (msg) {
    // console.log("got message", msg);
    const decoded = JSON.parse(msg);
    if (decoded && decoded.type === ".hello") {
      nodeid = decoded.node;
    }
    decoded._channel = channel;
    decoded._id = id;

    if (channel) {
      broadcast(JSON.stringify(decoded), channel);

      let metric = channelmetrics[channel];
      if (!metric) {
        metric = {};
        metric.lastseen = Date.now();
        metric.events = 1;
        channelmetrics[channel] = metric;
      } else {
        metric.lastseen = Date.now();
        metric.events++;
      }
    }
  });

  ws.on("close", () => {
    console.log("disconnect", channel, id, nodeid);
    broadcast(
      JSON.stringify({
        type: ".disconnect",
        _node: nodeid,
        _channel: channel,
        _id: id,
      }),
      channel
    );
  });
});

app.listen(PORT, function () {
  console.log(`web server listening on port ${PORT}`);
});
