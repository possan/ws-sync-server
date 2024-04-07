import { SyncClient } from "./client.js";

let sync;
let channel;
let mode = 1;
let deviceid;
let midi;
let midiDeviceListElement;
let selectedMidiDevices = [];
let counter;
let inputcounter;
let countElement;
let countElement2;
let flagelement0;
let flagelement1;
let flagelement2;
let flagelement3;

function getChannelFromUrl() {
  const hash = document.location.hash.substring(1);
  const u = new URLSearchParams(`?${hash}`);
  const channel = u.get("channel");
  console.log("channel", channel);
  return channel;
}

function getModeFromUrl() {
  const hash = document.location.hash.substring(1);
  const u = new URLSearchParams(`?${hash}`);
  const mode = u.get("mode") ?? 1;
  console.log("mode", mode);
  return mode;
}

function handler(event) {
  // console.log("got event", event);

  if (event.type === ".welcome") {
    deviceid = event._id;
    document.getElementById("deviceid").innerText = `${deviceid}`;
  }

  if (event.type === ".averagelatency") {
    document.getElementById("avglatency").textContent =
      Math.round(event.value * 10000) / 10000;
  }
}

const NOTE_VALUES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];
function getMIDINote(dataByte1LSB) {
  return dataByte1LSB <= 126
    ? `${NOTE_VALUES[dataByte1LSB % 12]}${
        Math.floor(dataByte1LSB / 12) - 2
      } - ${dataByte1LSB}`
    : "NO NOTE";
}

function handleMidi(message) {
  const arr = Array.from(message.data);
  const cmd = (arr[0] & 0xf0) >> 4;

  inputcounter++;
  countElement2.textContent = `${inputcounter}`;

  if ((mode & 8) !== 8) {
    // We should NOT send realtime events..
    if (cmd === 0xf) {
      return;
    }
  }

  console.log("got midi", cmd, message.data);

  if ((mode & 1) === 1) {
    // send regular
    sync.send({
      type: "midi",
      node: deviceid,
      data: arr,
    });
  }

  if ((mode & 2) === 2) {
    // send as cables.gl
    const cableformat = {};

    cableformat.channel = arr[0] & 0x0f;
    cableformat.cmd = (arr[0] & 0xf0) >> 4;

    // {
    //   "deviceName": "Loopback Bus 2",
    //   "inputId": 0,
    //   "messageType": "Note",
    //   "index": 28,
    //   "value": 0,
    //   "cmd": 8,
    //   "channel": 0,
    //   "type": 128,
    //   "note": 28,
    //   "velocity": 0,
    //   "data": {
    //       "0": 128,
    //       "1": 28,
    //       "2": 0
    //   },
    //   "newNote": [
    //       28,
    //       "E0 - 28"
    //   ]
    // }

    // {
    //   "deviceName": "Loopback Bus 2",
    //   "inputId": 0,
    //   "messageType": "CC",
    //   "index": 31,
    //   "value": 61,
    //   "cmd": 11,
    //   "channel": 0,
    //   "type": 176,
    //   "note": 31,
    //   "velocity": 61,
    //   "data": {
    //       "0": 176,
    //       "1": 31,
    //       "2": 61
    //   }
    // }

    cableformat.type = arr[0];
    cableformat.data = [];
    cableformat.note = arr[1];
    cableformat.index = arr[1];
    cableformat.velocity = arr[2];
    cableformat.value = arr[2];

    if (cableformat.cmd === 0x8 || cableformat.cmd === 0x9) {
      cableformat.messageType = "Note";
      cableformat.data = arr;
      cableformat.newNote = [cableformat.note, getMIDINote(cableformat.note)];
    }

    if (cableformat.cmd === 0xb) {
      cableformat.messageType = "CC";
      cableformat.data = arr;
    }

    console.log("cables format", cableformat);

    if (cableformat.messageType) {
      sync.send(cableformat);
    }
  }

  counter++;
  countElement.textContent = `${counter}`;
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
    "selectedmidiinputs",
    JSON.stringify(selectedMidiDevices)
  );

  for (const [id, inp] of midi.inputs) {
    inp.onmidimessage = undefined;
    if (selectedMidiDevices.indexOf(inp.name) !== -1) {
      inp.onmidimessage = handleMidi;
    }
  }
}

async function updateMidiList() {
  console.log("midi changed", midi);

  midiDeviceListElement.innerHTML = "";

  for (const [id, inp] of midi.inputs) {
    const opt = new Option();
    console.log("input", inp, id);
    opt.value = inp.id;
    opt.label = inp.name;
    opt.selected = selectedMidiDevices.indexOf(inp.name) !== -1;
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

function updateModeFlags() {
  mode = 0;
  if (flagelement0.checked) mode += 1;
  if (flagelement1.checked) mode += 2;
  if (flagelement2.checked) mode += 4;
  if (flagelement3.checked) mode += 8;
  console.log("flags", mode);

  location = `#channel=${channel}&mode=${mode}`;
}

function load() {
  console.log("window loaded");

  mode = getModeFromUrl();

  channel = getChannelFromUrl();
  document.getElementById("channel").innerText = `${channel}`;

  const sel = localStorage.getItem("selectedmidiinputs") ?? "";
  selectedMidiDevices = [];
  try {
    selectedMidiDevices = JSON.parse(sel);
  } catch (e) {}
  console.log("initial selection", selectedMidiDevices);

  const secure = location.protocol.indexOf("https") !== -1;
  let wsurl = `${secure ? "wss" : "ws"}://${
    location.host
  }/broadcast/${channel}`;
  if ((mode & 4) === 4) {
    wsurl = `wss://sync.hemma.possan.codes/broadcast/${channel}`;
  }
  document.getElementById("wsurl").innerText = wsurl;

  sync = new SyncClient(wsurl, undefined);
  sync.subscribe(handler);
  sync.connect();

  inputcounter = 0;
  counter = 0;
  countElement = document.getElementById("eventcount");
  countElement2 = document.getElementById("inputeventcount");
  midiDeviceListElement = document.getElementById("mididevices");

  flagelement0 = document.getElementById("modeflag0");
  flagelement1 = document.getElementById("modeflag1");
  flagelement2 = document.getElementById("modeflag2");
  flagelement3 = document.getElementById("modeflag3");
  flagelement0.checked = (mode & 1) === 1;
  flagelement1.checked = (mode & 2) === 2;
  flagelement2.checked = (mode & 4) === 4;
  flagelement3.checked = (mode & 8) === 8;
  flagelement0.addEventListener("click", updateModeFlags);
  flagelement1.addEventListener("click", updateModeFlags);
  flagelement2.addEventListener("click", updateModeFlags);
  flagelement3.addEventListener("click", updateModeFlags);

  document.getElementById("enablemidi").addEventListener("click", enableMIDI);
  setTimeout(enableMIDI, 1000);

  document
    .getElementById("mididevices")
    .addEventListener("change", updateMidiConnections);
}

window.addEventListener("load", load);
