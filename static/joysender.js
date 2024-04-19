import { SyncClient } from "./client.js";

const gamepads = {};
let lastbuttons = [];

let sync;
let channel;
let mode = 1;
let deviceid;
let counter;
let inputcounter;
let countElement;
let countElement2;
let flagelement0;
let flagelement1;

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

  // if ((mode & 1) === 1) {
  //   // send regular
  //   sync.send({
  //     type: "midi",
  //     node: deviceid,
  //     data: arr,
  //   });
  // }

  if ((mode & 1) === 1) {
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

function updateModeFlags() {
  mode = 0;
  if (flagelement0.checked) mode += 1;
  if (flagelement1.checked) mode += 2;
  // if (flagelement2.checked) mode += 4;
  // if (flagelement3.checked) mode += 8;
  console.log("flags", mode);

  location = `#channel=${channel}&mode=${mode}`;
}

function load() {
  console.log("window loaded");

  mode = getModeFromUrl();

  channel = getChannelFromUrl();
  document.getElementById("channel").innerText = `${channel}`;

  const secure = location.protocol.indexOf("https") !== -1;
  let wsurl = `${secure ? "wss" : "ws"}://${
    location.host
  }/broadcast/${channel}`;
  if ((mode & 2) === 2) {
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

  flagelement0 = document.getElementById("modeflag0");
  flagelement0.checked = (mode & 1) === 1;
  flagelement0.addEventListener("click", updateModeFlags);

  flagelement1 = document.getElementById("modeflag1");
  flagelement1.checked = (mode & 2) === 2;
  flagelement1.addEventListener("click", updateModeFlags);

  window.addEventListener("gamepadconnected", (e) => {
    console.log(
      "Gamepad connected at index %d: %s. %d buttons, %d axes.",
      e.gamepad.index,
      e.gamepad.id,
      e.gamepad.buttons.length,
      e.gamepad.axes.length
    );

    document.getElementById("joyconnected").style.display = "block";

    const gamepad = event.gamepad;
    gamepads[gamepad.index] = gamepad;
  });

  window.addEventListener("gamepaddisconnected", (e) => {
    console.log(
      "Gamepad disconnected from index %d: %s",
      e.gamepad.index,
      e.gamepad.id
    );

    document.getElementById("joyconnected").style.display = "none";

    const gamepad = event.gamepad;
    delete gamepads[gamepad.index];
  });

  let laststate = "";

  function sendNoteOn(note, down) {
    console.log("send note on", note);
    if (down) {
      handleMidi({ data: [0x90, note, 0x78] });
    } else {
      handleMidi({ data: [0x80, note, 0x40] });
    }
    // setTimeout(() => {
    // }, 100);
  }

  function checkGamepads() {
    const gamepads = navigator.getGamepads();
    // console.log("gamepads", gamepads);

    let state = {};
    let buttons = [];
    for (const k of gamepads) {
      if (k) {
        buttons = k.buttons.map((b) => b.pressed);

        state = {
          axes: k.axes,
          buttons,
        };
      }
    }

    for (var k = 0; k < buttons.length; k++) {
      if (buttons[k] !== lastbuttons[k]) {
        console.log("button changed", k, buttons[k]);

        // if (buttons[k]) {
        // 0 1 2 3
        // 12 13 14 15
        // 4 5
        if (k === 0) sendNoteOn(3, buttons[k]);
        if (k === 1) sendNoteOn(1, buttons[k]);
        if (k === 2) sendNoteOn(12, buttons[k]);
        if (k === 3) sendNoteOn(18, buttons[k]);
        if (k === 12) sendNoteOn(21, buttons[k]);
        if (k === 13) sendNoteOn(3, buttons[k]);
        if (k === 14) sendNoteOn(1, buttons[k]);
        if (k === 15) sendNoteOn(12, buttons[k]);
        if (k === 4) sendNoteOn(18, buttons[k]);
        if (k === 5) sendNoteOn(21, buttons[k]);
        // }

        lastbuttons[k] = buttons[k];
      }
    }

    const jsonstate = JSON.stringify(state, null, 2);
    if (jsonstate !== laststate) {
      laststate = jsonstate;
      document.getElementById("joystickstate").value = jsonstate;
    }

    setTimeout(checkGamepads, 30);
    // requestAnimationFrame(checkGamepads)
  }

  checkGamepads();
}

window.addEventListener("load", load);
