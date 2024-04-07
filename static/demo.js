import { SyncClient } from "./client.js";

let sync;
let nodeid;
let inittime;
let lastmastertime;
let lastsynctime;
let channel;
let connectionid;
let clockelement;
let fillelement;
let fillelement2;

function getChannelFromUrl() {
  const hash = document.location.hash.substring(1);
  const u = new URLSearchParams(`?${hash}`);
  const channel = u.get("channel");
  console.log("channel", channel);
  return channel;
}

function getNodeIdFromUrl() {
  const hash = document.location.hash.substring(1);
  const u = new URLSearchParams(`?${hash}`);
  const id = ~~u.get("node");
  console.log("hash", hash);
  console.log("u", u);
  console.log("id", id);
  return id;
}

const elementForId = {};

function handler(event) {
  //   console.log("got event", event);

  if (event.type === ".welcome") {
    connectionid = event._id;
    document.getElementById("connectionid").innerText = `${connectionid}`;
  }

  if (event.type === ".hello") {
    // const el = document.createElement()
  }

  if (event.type === ".disconnect") {
    const el = elementForId[event.node];
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }

  if (event.type === "mouse") {
    let el = elementForId[event.node];
    if (!el) {
      el = document.createElement("div");
      elementForId[event.node] = el;
      document.getElementById("demo").appendChild(el);
      el.innerText = `#${event.node}`;
    }
    el.style.left = `${event.x}px`;
    el.style.top = `${event.y}px`;
  }

  if (event.type === "localclock") {
    if (event.node === 0) {
      lastsynctime = Date.now();
      lastmastertime = event.time;
    }
  }
}

function load() {
  console.log("window loaded");
  inittime = Date.now();

  nodeid = getNodeIdFromUrl();
  channel = getChannelFromUrl();

  const secure = location.protocol.indexOf("https") !== -1;

  sync = new SyncClient(
    `${secure ? "wss" : "ws"}://${location.host}/broadcast/${channel}`,
    nodeid
  );
  sync.subscribe(handler);
  sync.connect();

  document.getElementById("nodeid").innerText = `${nodeid}`;
  document.getElementById("channel").innerText = `${channel}`;

  clockelement = document.getElementById("clock");
  fillelement = document.getElementById("fill");
  fillelement2 = document.getElementById("fill2");

  window.addEventListener("mousemove", (e) => {
    sync.send({
      type: "mouse",
      node: nodeid,
      x: e.clientX,
      y: e.clientY,
    });
  });

  document.getElementById("reload").addEventListener("click", () => {
    location.reload();
  });

  setInterval(() => {
    sync.send({
      type: "localclock",
      node: nodeid,
      time: Date.now() - inittime,
    });
  }, 3000);

  setInterval(() => {
    let reltime = 0;
    if (nodeid === 0) {
      reltime = Date.now() - inittime;
      clockelement.innerText = `M:${reltime}`;
    } else {
      reltime = Date.now() - lastsynctime + lastmastertime;
      clockelement.innerText = `S:${reltime}`;
    }
  }, 100);

  setInterval(() => {
    let reltime = 0;
    if (nodeid === 0) {
      reltime = Date.now() - inittime;
    } else {
      reltime = Date.now() - lastsynctime + lastmastertime;
    }
    const pct = Math.round(((reltime % 1000) * 100) / 1000);
    fillelement.style = `width:${pct}%;`;
    if (reltime % 250 < 50) {
      fillelement2.style = `width:100%;`;
    } else {
      fillelement2.style = `width:0%;`;
    }
    // const pct2 = Math.round(((reltime % 100) * 100) / 100);
  }, 20);
}

window.addEventListener("load", load);
