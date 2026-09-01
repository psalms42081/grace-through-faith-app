(function () {
  var cfgEl = document.getElementById("live-config");
  var config = {};
  try {
    config = cfgEl ? JSON.parse(cfgEl.textContent || "{}") : {};
  } catch (e) {
    config = {};
  }

  var groupName = document.getElementById("group-name");
  var lessonTitle = document.getElementById("lesson-title");
  var notice = document.getElementById("notice");
  var statusEl = document.getElementById("status");
  var preview = document.getElementById("preview");
  var previewVideo = document.getElementById("preview-video");
  var previewPlaceholder = document.getElementById("preview-placeholder");
  var roomEl = document.getElementById("room");
  var grid = document.getElementById("grid");
  var spotlight = document.getElementById("spotlight");
  var strip = document.getElementById("strip");
  var btnJoin = document.getElementById("btn-join");
  var btnPreviewMic = document.getElementById("btn-preview-mic");
  var btnPreviewCam = document.getElementById("btn-preview-cam");
  var btnPreviewFlip = document.getElementById("btn-preview-flip");
  var btnMic = document.getElementById("btn-mic");
  var btnCam = document.getElementById("btn-cam");
  var btnFlip = document.getElementById("btn-flip");
  var btnLeave = document.getElementById("btn-leave");
  var btnEnd = document.getElementById("btn-end");

  groupName.textContent = config.groupName || "Group";
  lessonTitle.textContent = config.lessonTitle || "";
  if (config.isHost) btnEnd.classList.remove("hidden");

  function postToApp(msg) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(msg));
    }
  }

  function showNotice(text) {
    notice.textContent = text;
    notice.classList.add("show");
  }

  function setStatus(text) {
    if (!text) {
      statusEl.classList.remove("show");
      statusEl.textContent = "";
      return;
    }
    statusEl.textContent = text;
    statusEl.classList.add("show");
  }

  if (typeof LivekitClient === "undefined") {
    setStatus("Could not load the room. Leave and try again.");
    return;
  }

  var Room = LivekitClient.Room;
  var RoomEvent = LivekitClient.RoomEvent;
  var Track = LivekitClient.Track;
  var VideoPresets = LivekitClient.VideoPresets;
  var createLocalTracks = LivekitClient.createLocalTracks;

  var previewTracks = [];
  var micEnabled = true;
  var camEnabled = true;
  var facing = "user";
  var room = null;
  var speaking = {};

  function initials(name) {
    var parts = (name || "?").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function setPill(btn, on) {
    btn.classList.toggle("on", on);
    btn.classList.toggle("off", !on);
  }

  async function startPreview() {
    try {
      previewTracks = await createLocalTracks({
        audio: true,
        video: { facingMode: facing, resolution: VideoPresets.h360.resolution },
      });
    } catch (err) {
      try {
        previewTracks = await createLocalTracks({ audio: true, video: false });
        camEnabled = false;
        showNotice("Camera is off. You can still join.");
      } catch (err2) {
        previewTracks = [];
        micEnabled = false;
        camEnabled = false;
        showNotice("Camera and microphone are off. You can still join to listen.");
      }
    }

    var videoTrack = previewTracks.find(function (t) { return t.kind === "video"; });
    if (videoTrack) {
      var el = videoTrack.attach();
      el.muted = true;
      el.playsInline = true;
      previewVideo.replaceWith(el);
      el.id = "preview-video";
      el.style.width = "100%";
      el.style.height = "100%";
      el.style.objectFit = "cover";
      el.style.transform = facing === "user" ? "scaleX(-1)" : "";
      previewVideo = el;
      previewPlaceholder.style.display = "none";
    } else {
      previewVideo.style.display = "none";
      previewPlaceholder.style.display = "flex";
      previewPlaceholder.textContent = initials(config.displayName);
    }
    setPill(btnPreviewMic, micEnabled);
    setPill(btnPreviewCam, camEnabled);
  }

  function stopPreview() {
    previewTracks.forEach(function (t) {
      try { t.stop(); } catch (e) {}
    });
    previewTracks = [];
  }

  btnPreviewMic.addEventListener("click", function () {
    micEnabled = !micEnabled;
    previewTracks.forEach(function (t) {
      if (t.kind === "audio") {
        if (micEnabled) t.unmute();
        else t.mute();
      }
    });
    setPill(btnPreviewMic, micEnabled);
  });

  btnPreviewCam.addEventListener("click", function () {
    camEnabled = !camEnabled;
    var videoTrack = previewTracks.find(function (t) { return t.kind === "video"; });
    if (videoTrack) {
      if (camEnabled) videoTrack.unmute();
      else videoTrack.mute();
      previewVideo.style.display = camEnabled ? "" : "none";
      previewPlaceholder.style.display = camEnabled ? "none" : "flex";
    }
    setPill(btnPreviewCam, camEnabled);
  });

  btnPreviewFlip.addEventListener("click", async function () {
    facing = facing === "user" ? "environment" : "user";
    stopPreview();
    await startPreview();
  });

  function mediaHost(tile) {
    var host = tile.querySelector(".media");
    if (!host) {
      host = document.createElement("div");
      host.className = "media";
      host.style.cssText = "position:absolute;inset:0;";
      tile.insertBefore(host, tile.firstChild);
    }
    return host;
  }

  function getOrCreateTile(identity, name, parent) {
    var id = "tile-" + identity;
    var tile = document.getElementById(id);
    if (!tile) {
      tile = document.createElement("div");
      tile.id = id;
      tile.className = "tile";
      var avatar = document.createElement("div");
      avatar.className = "avatar";
      avatar.id = "avatar-" + identity;
      avatar.textContent = initials(name);
      tile.appendChild(avatar);
      var label = document.createElement("div");
      label.className = "name";
      label.textContent = name || identity;
      tile.appendChild(label);
      var icons = document.createElement("div");
      icons.className = "icons";
      icons.id = "icons-" + identity;
      tile.appendChild(icons);
    }
    if (parent && tile.parentElement !== parent) parent.appendChild(tile);
    return tile;
  }

  function setIcons(identity, muted, cameraOff) {
    var icons = document.getElementById("icons-" + identity);
    if (!icons) return;
    icons.innerHTML = "";
    if (muted) {
      var m = document.createElement("div");
      m.className = "badge";
      m.textContent = "Mic off";
      m.style.width = "auto";
      m.style.padding = "0 6px";
      m.style.fontSize = "10px";
      icons.appendChild(m);
    }
    if (cameraOff) {
      var c = document.createElement("div");
      c.className = "badge";
      c.textContent = "Cam off";
      c.style.width = "auto";
      c.style.padding = "0 6px";
      c.style.fontSize = "10px";
      icons.appendChild(c);
    }
  }

  function attachTrack(track, identity, name) {
    var tile = getOrCreateTile(identity, name, grid);
    var avatar = document.getElementById("avatar-" + identity);
    var isLocal = room && room.localParticipant && identity === room.localParticipant.identity;
    if (isLocal && track.kind === "audio") return;
    var host = mediaHost(tile);
    if (track.kind === "video") {
      host.querySelectorAll("video").forEach(function (v) { v.remove(); });
      var el = track.attach();
      el.style.width = "100%";
      el.style.height = "100%";
      el.style.objectFit = "cover";
      if (isLocal) el.style.transform = facing === "user" ? "scaleX(-1)" : "";
      host.appendChild(el);
      if (avatar) avatar.style.display = "none";
    } else if (track.kind === "audio") {
      host.querySelectorAll("audio").forEach(function (a) { a.remove(); });
      var audio = track.attach();
      audio.style.display = "none";
      host.appendChild(audio);
    }
    layoutTiles();
  }

  function participantList() {
    if (!room) return [];
    var list = [];
    if (room.localParticipant) {
      list.push(room.localParticipant);
    }
    room.remoteParticipants.forEach(function (p) { list.push(p); });
    return list.slice(0, 12);
  }

  function layoutTiles() {
    var parts = participantList();
    var count = parts.length;
    var useSpotlight = count > 4;
    spotlight.innerHTML = "";
    strip.innerHTML = "";
    strip.classList.toggle("show", useSpotlight);
    grid.style.display = useSpotlight ? "none" : "grid";
    grid.className = count >= 3 ? "four" : count === 2 ? "two" : "";

    var activeId = Object.keys(speaking)[0] || (parts[0] && parts[0].identity);
    parts.forEach(function (p, i) {
      var parent = grid;
      if (useSpotlight) {
        parent = p.identity === activeId || (!activeId && i === 0) ? spotlight : strip;
        if (spotlight.childElementCount > 0 && parent === spotlight) parent = strip;
      }
      var tile = getOrCreateTile(p.identity, p.name, parent);
      tile.classList.toggle("speaking", !!speaking[p.identity]);
      var muted = p.isMicrophoneEnabled === false;
      var cameraOff = p.isCameraEnabled === false;
      setIcons(p.identity, muted, cameraOff);
      var avatar = document.getElementById("avatar-" + p.identity);
      if (avatar) avatar.style.display = cameraOff ? "flex" : "none";
    });
  }

  async function connect() {
    if (!config.wsUrl || !config.token) {
      setStatus("Missing room details. Leave and try again.");
      return;
    }
    setStatus("Joining…");
    room = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: { resolution: VideoPresets.h360.resolution },
    });

    room.on(RoomEvent.TrackSubscribed, function (track, _pub, participant) {
      attachTrack(track, participant.identity, participant.name);
    });
    room.on(RoomEvent.TrackUnsubscribed, function (track) {
      track.detach().forEach(function (el) { el.remove(); });
    });
    room.on(RoomEvent.LocalTrackPublished, function (pub) {
      if (pub.track) attachTrack(pub.track, room.localParticipant.identity, room.localParticipant.name);
    });
    room.on(RoomEvent.ParticipantConnected, layoutTiles);
    room.on(RoomEvent.ParticipantDisconnected, function (p) {
      var tile = document.getElementById("tile-" + p.identity);
      if (tile) tile.remove();
      layoutTiles();
    });
    room.on(RoomEvent.TrackMuted, layoutTiles);
    room.on(RoomEvent.TrackUnmuted, layoutTiles);
    room.on(RoomEvent.ActiveSpeakersChanged, function (speakers) {
      speaking = {};
      speakers.forEach(function (s) { speaking[s.identity] = true; });
      layoutTiles();
    });
    room.on(RoomEvent.Disconnected, function () {
      postToApp({ type: "call_ended", reason: "disconnected" });
    });

    await room.connect(config.wsUrl, config.token);
    getOrCreateTile(room.localParticipant.identity, room.localParticipant.name, grid);

    try {
      await room.localParticipant.setMicrophoneEnabled(micEnabled);
    } catch (e) {
      micEnabled = false;
      showNotice("Microphone is off. You can still stay in the room.");
    }
    try {
      await room.localParticipant.setCameraEnabled(camEnabled, { facingMode: facing });
    } catch (e) {
      camEnabled = false;
      if (!notice.classList.contains("show")) {
        showNotice("Camera is off. You can still stay in the room.");
      }
    }

    preview.classList.add("hidden");
    roomEl.classList.add("show");
    setPill(btnMic, micEnabled);
    setPill(btnCam, camEnabled);
    btnMic.classList.toggle("on", micEnabled);
    btnCam.classList.toggle("on", camEnabled);
    layoutTiles();
    setStatus("");
    postToApp({ type: "connected" });
  }

  btnJoin.addEventListener("click", async function () {
    btnJoin.disabled = true;
    try {
      previewTracks.forEach(function (t) {
        try { t.stop(); } catch (e) {}
      });
      previewTracks = [];
      await connect();
    } catch (err) {
      setStatus("Could not join. " + (err && err.message ? err.message : ""));
      btnJoin.disabled = false;
    }
  });

  btnMic.addEventListener("click", async function () {
    if (!room) return;
    try {
      micEnabled = !micEnabled;
      await room.localParticipant.setMicrophoneEnabled(micEnabled);
      btnMic.classList.toggle("on", micEnabled);
    } catch (e) {
      micEnabled = !micEnabled;
      showNotice("Microphone could not be changed.");
    }
  });

  btnCam.addEventListener("click", async function () {
    if (!room) return;
    try {
      camEnabled = !camEnabled;
      await room.localParticipant.setCameraEnabled(camEnabled, { facingMode: facing });
      btnCam.classList.toggle("on", camEnabled);
    } catch (e) {
      camEnabled = !camEnabled;
      showNotice("Camera could not be changed.");
    }
  });

  btnFlip.addEventListener("click", async function () {
    if (!room) return;
    facing = facing === "user" ? "environment" : "user";
    try {
      var pub = room.localParticipant.getTrackPublication(Track.Source.Camera);
      if (pub && pub.track && pub.track.restartTrack) {
        await pub.track.restartTrack({ facingMode: facing });
      } else {
        await room.localParticipant.setCameraEnabled(false);
        await room.localParticipant.setCameraEnabled(true, { facingMode: facing });
      }
    } catch (e) {
      showNotice("Could not flip the camera.");
    }
  });

  btnLeave.addEventListener("click", async function () {
    if (room) {
      try { await room.disconnect(); } catch (e) {}
    }
    postToApp({ type: "call_ended", reason: "user_left" });
  });

  btnEnd.addEventListener("click", async function () {
    if (room) {
      try { await room.disconnect(); } catch (e) {}
    }
    postToApp({ type: "end_room" });
  });

  startPreview();
})();
