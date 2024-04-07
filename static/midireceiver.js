import { SyncClient } from "./client.js";

let sync;
let channel;
let deviceid;
let midi;
let midiDeviceListElement;
let selectedMidiDevices = [];
let counter;
let countElement;

function getChannelFromUrl() {
  const hash = document.location.hash.substring(1);
  const u = new URLSearchParams(`?${hash}`);
  const channel = u.get("channel");
  console.log("channel", channel);
  return channel;
}

function handler(event) {
  if (event.type === ".welcome") {
    deviceid = event.id;
    document.getElementById("deviceid").innerText = `${deviceid}`;
  } else if (event.type === "midi") {
    console.log("got midi event", event, selectedMidiDevices);

    for (const [id, outp] of midi.outputs) {
      console.log("sending to?", outp, outp.name);
      if (selectedMidiDevices.indexOf(outp.name) !== -1) {
        console.log("sending to!", outp);
        outp.send(event.data);
      }
    }

    counter++;
    countElement.textContent = `${counter}`;
  } else if (event.type === ".averagelatency") {
    document.getElementById("avglatency").textContent =
      Math.round(event.value * 10000) / 10000;
  } else {
    console.log("got unhandled event", event);
  }
}

function updateMidiConnections() {
  console.log("update midi connections");

  selectedMidiDevices = [];
  for (var k = 0; k < midiDeviceListElement.options.length; k++) {
    const opt = midiDeviceListElement.options[k];
    if (opt.selected) {
      console.log("selected", opt);
      selectedMidiDevices.push(opt.label);
    }
  }
  console.log("updated list", selectedMidiDevices);
  localStorage.setItem(
    "selectedmidioutputs",
    JSON.stringify(selectedMidiDevices)
  );
}

async function updateMidiList() {
  console.log("midi changed", midi);

  midiDeviceListElement.innerHTML = "";

  for (const [id, outp] of midi.outputs) {
    const opt = new Option();
    console.log("output", outp, id);
    opt.value = outp.id;
    opt.label = outp.name;
    opt.selected = selectedMidiDevices.indexOf(outp.name) !== -1;
    midiDeviceListElement.options[midiDeviceListElement.options.length] = opt;
  }

  updateMidiConnections();
}

async function enableMIDI() {
  midi = await navigator.requestMIDIAccess({
    software: true,
  });

  console.log("got midi access", midi);

  document.getElementById("midiconnected").style.display = "block";
  document.getElementById("mididisconnected").style.display = "none";

  updateMidiList();

  midi.addEventListener("statechange", () => {
    updateMidiList();
  });
}

function load() {
  console.log("window loaded");

  channel = getChannelFromUrl();
  document.getElementById("channel").innerText = `${channel}`;

  const sel = localStorage.getItem("selectedmidioutputs") ?? "";
  selectedMidiDevices = [];
  try {
    selectedMidiDevices = JSON.parse(sel);
  } catch (e) {}
  console.log("initial selection", selectedMidiDevices);

  const secure = location.protocol.indexOf("https") !== -1;
  const wsurl = `${secure ? "wss" : "ws"}://${
    location.host
  }/broadcast/${channel}`;
  document.getElementById("wsurl").innerText = wsurl;

  sync = new SyncClient(wsurl, undefined);
  sync.subscribe(handler);
  sync.connect();

  counter = 0;
  countElement = document.getElementById("eventcount");
  midiDeviceListElement = document.getElementById("mididevices");

  document.getElementById("enablemidi").addEventListener("click", enableMIDI);
  setTimeout(enableMIDI, 1000);

  document
    .getElementById("mididevices")
    .addEventListener("change", updateMidiConnections);
}

window.addEventListener("load", load);
