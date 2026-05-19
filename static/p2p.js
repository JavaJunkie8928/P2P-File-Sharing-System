const roomName = "example_room"; // You can dynamically generate the room name as needed
const socket = new WebSocket(
  "ws://" + window.location.host + "/ws/signal/" + roomName + "/"
);
let peerConnection = null;
let dataChannel = null;
let receiverChannelId = null; // Store receiver's channel name
let isNegotiating = false;

// Handle incoming WebSocket messages
let pendingCandidates = [];

socket.onmessage = function (e) {
  const data = JSON.parse(e.data);

  if (data.otp) {
    document.getElementById("otpDisplay").innerText = `Your OTP: ${data.otp}`;
  }

  if (data.receiver_channel) {
    receiverChannelId = data.receiver_channel;
    createPeerConnection();
    createOffer(receiverChannelId);
  }

  if (data.signal) {
    if (!peerConnection) {
      createPeerConnection();
    }
    handleSignalingMessage(data.signal);
  }
};

function startFileTransfer() {
  socket.send(JSON.stringify({ request_otp: true }));
  document.getElementById("status").innerText = "Requesting OTP...";
}

function createOffer(receiver_channel) {
  peerConnection
    .createOffer()
    .then((offer) => peerConnection.setLocalDescription(offer))
    .then(() => {
      sendSignal(
        {
          type: "offer",
          sdp: peerConnection.localDescription.sdp,
        },
        receiver_channel
      );
    })
    .catch((error) => console.error("Error creating offer:", error));
}

function createPeerConnection() {
  peerConnection = new RTCPeerConnection();

  dataChannel = peerConnection.createDataChannel("fileTransfer");
  dataChannel.onopen = handleDataChannelOpen;

  peerConnection.onicecandidate = handleIceCandidate;
  peerConnection.ondatachannel = handleDataChannel;
}

function handleDataChannelOpen() {
  console.log("Data channel opened");
  document.getElementById("status").innerText =
    "Data channel opened. Ready to send file.";
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];
  if (file) {
    sendFileOverDataChannel(file);
  } else {
    console.error("No file selected");
    document.getElementById("status").innerText = "Error: No file selected";
  }
}

function handleIceCandidate(event) {
  if (event.candidate) {
    sendSignal(
      {
        type: "ice_candidate",
        ice_candidate: event.candidate,
      },
      receiverChannelId
    );
  }
}

function handleDataChannel(event) {
  const receiveChannel = event.channel;
  receiveChannel.onmessage = handleFileReceive;
}

function handleFileReceive(event) {
  const receivedBlob = event.data;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(receivedBlob);
  link.download = "received_file";
  link.click();
  URL.revokeObjectURL(link.href);
}

function sendFileOverDataChannel(file) {
  const chunkSize = 16384; // 16 KB chunks
  let offset = 0;
  let fileReader = new FileReader();

  const progressBar = document.getElementById("progress-bar");
  progressBar.value = 0; // Initialize progress
  progressBar.max = 100;
  // Send file metadata first
  dataChannel.send(
    JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    })
  );

  fileReader.onload = function (e) {
    // Wait until the bufferedAmount is below a certain threshold
    const sendNextChunk = () => {
      if (dataChannel.bufferedAmount < 65535) {
        // 64 KB threshold
        dataChannel.send(e.target.result);
        offset += e.target.result.byteLength;
        const progress = (offset / file.size) * 100;
        progressBar.value = progress;
        document.getElementById(
          "status"
        ).innerText = `Transferred: ${Math.round(progress)}%`;
        if (offset < file.size) {
          readSlice(offset);
        } else {
          document.getElementById("status").innerText =
            "File sent successfully!";
        }
      } else {
        // Check again after some time if buffer is still full
        setTimeout(sendNextChunk, 100); // Wait for 100ms and check again
      }
    };

    sendNextChunk();
  };

  const readSlice = function (o) {
    const slice = file.slice(o, o + chunkSize);
    fileReader.readAsArrayBuffer(slice);
  };

  readSlice(0);
}

function sendSignal(signal, target_channel) {
  socket.send(
    JSON.stringify({
      signal: signal,
      target: target_channel,
    })
  );
}

function handleSignalingMessage(signal) {
  if (signal.type === "answer") {
    peerConnection
      .setRemoteDescription(new RTCSessionDescription(signal))
      .then(() => {
        console.log("Remote description set successfully with answer");
        // Add any pending candidates
        pendingCandidates.forEach((candidate) =>
          peerConnection.addIceCandidate(candidate)
        );
        pendingCandidates = [];
      })
      .catch((error) =>
        console.error("Error setting remote description:", error)
      );
  } else if (signal.type === "ice_candidate") {
    const iceCandidate = new RTCIceCandidate(signal.ice_candidate);
    if (peerConnection.remoteDescription) {
      peerConnection
        .addIceCandidate(iceCandidate)
        .then(() => console.log("ICE candidate added successfully"))
        .catch((error) => console.error("Error adding ICE candidate:", error));
    } else {
      pendingCandidates.push(iceCandidate);
    }
  }
}
