import { SyncClient } from "./client.js";

let sync;
let nodeid;
let inittime;
let lastmastertime;
let lastsynctime;
let channel;
let connectionid;

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

  if (event.type === "welcome") {
    connectionid = event.id;
    document.getElementById("connectionid").innerText = `${connectionid}`;
  }

  if (event.type === "hello") {
    // const el = document.createElement()
  }

  if (event.type === "disconnect") {
    const el = elementForId[event.node];
    if (el) {
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

  if (event.type === "clock") {
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

  sync = new SyncClient(`ws://localhost:3000/broadcast/${channel}`, nodeid);
  sync.subscribe(handler);
  sync.connect();

  document.getElementById("nodeid").innerText = `${nodeid}`;
  document.getElementById("channel").innerText = `${channel}`;

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
    if (nodeid === 0) {
      // send master clock data
      sync.send({
        type: "clock",
        node: nodeid,
        time: Date.now() - inittime,
      });
    }
  }, 3000);

  setInterval(() => {
    if (nodeid === 0) {
      const localtime = Date.now() - inittime;
      document.getElementById("clock").innerText = `M:${localtime}`;
    } else {
      const remotetime = Date.now() - lastsynctime + lastmastertime;
      document.getElementById("clock").innerText = `S:${remotetime}`;
    }
  }, 50);
}

window.addEventListener("load", load);
