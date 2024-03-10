import { SyncClient } from "./client.js";

let sync;
let inittime;
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
  console.log("got event", event);

  if (event.type === "welcome") {
    deviceid = event.id;
    document.getElementById("deviceid").innerText = `${deviceid}`;
  }
}

function handleMidi(message) {
  // console.log("got midi", message.data);
  sync.send({
    type: "midi",
    node: deviceid,
    data: Array.from(message.data),
  });
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

function load() {
  console.log("window loaded");

  inittime = Date.now();
  channel = getChannelFromUrl();

  const sel = localStorage.getItem("selectedmidiinputs") ?? "";
  selectedMidiDevices = [];
  try {
    selectedMidiDevices = JSON.parse(sel);
  } catch (e) {}
  console.log("initial selection", selectedMidiDevices);

  const secure = location.protocol.indexOf("https") !== -1;
  sync = new SyncClient(
    `${secure ? "wss" : "ws"}://${location.host}/broadcast/${channel}`,
    undefined
  );
  sync.subscribe(handler);
  sync.connect();

  document.getElementById("channel").innerText = `${channel}`;

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
