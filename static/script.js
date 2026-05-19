const roomName = "example_room"; // You can dynamically generate the room name as needed
const socket = new WebSocket(
  "ws://" + window.location.host + "/ws/signal/" + roomName + "/"
);
let peerConnection = null;
let dataChannel = null;
let receiverChannelId = null; // Store receiver's channel name
let isNegotiating = false;
const progressBar = document.querySelector(".progress-bar");
// Handle incoming WebSocket messages
let pendingCandidates = [];
function copyToClipboard(otp) {
  // Create a temporary textarea element to hold the OTP
  const tempInput = document.createElement("textarea");
  tempInput.value = otp; // Set its value to the OTP
  document.body.appendChild(tempInput); // Append to the body
  tempInput.select(); // Select the text
  document.execCommand("copy"); // Copy the text
  document.body.removeChild(tempInput); // Remove the temporary element

  // Optionally, you can show a message to the user
  alert("OTP copied to clipboard!");
}
socket.onmessage = function (e) {
  const data = JSON.parse(e.data);

  if (data.otp) {
    document.getElementById("otp").innerText = `Your OTP: ${data.otp}`;
    document.getElementById(
      "otp"
    ).innerHTML = `<div class="card mt-2 p-3 mb-2"><div class="d-flex justify-content-between align-items-center gap-3"><h5> Your Key :<strong> ${data.otp}</strong> </h5><i class="fa-solid fa-copy fa-xl" onclick="copyToClipboard('${data.otp}')" style="cursor: pointer;" ></i></div></div>`;
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
  console.log("Data channel created:", dataChannel);
  peerConnection.onicecandidate = handleIceCandidate;
  peerConnection.ondatachannel = handleDataChannel;
}

function handleDataChannelOpen() {
  console.log("Data channel opened");
  document.getElementById("status").innerText =
    "Data channel opened. Ready to send file.";
  //const fileInput = document.getElementById("fileInput");
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
  progressBar.style.width = 0;
  progressBar.value = 0; // Initialize progress
  progressBar.max = 100;
  console.log(
    JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    })
  );
  // Send file metadata first
  dataChannel.send(
    JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    })
  );
  progressBar.style.width = 0;
  fileReader.onload = function (e) {
    // Wait until the bufferedAmount is below a certain threshold
    const sendNextChunk = () => {
      if (dataChannel.bufferedAmount < 65535) {
        // 64 KB threshold
        dataChannel.send(e.target.result);
        offset += e.target.result.byteLength;
        const progress = (offset / file.size) * 100;
        progressBar.value = progress;
        uploadButton.innerHTML = `<span> Uploading  ${Math.round(
          progressBar.value
        )}% </span>`;
        var width = 0;
        var id = setInterval(frame, 50);
        function frame() {
          if (progressBar.value === 100) {
            clearInterval(id);
            uploadButton.innerHTML = `<span class="material-icons-outlined upload-button-icon"> check_circle </span> <span> File Sent Successfully! </span> `;
            uploadButton.style.backgroundColor = "green";
            uploadButton.disabled = true;
            uploadButton.style.cursor = "auto";
          } else {
            progressBar.style.width = Math.round(progressBar.value) + "%";
          }
        }

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

//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//

var isAdvancedUpload = (function () {
  var div = document.createElement("div");
  return (
    ("draggable" in div || ("ondragstart" in div && "ondrop" in div)) &&
    "FormData" in window &&
    "FileReader" in window
  );
})();

let draggableFileArea = document.querySelector(".drag-file-area");
let browseFileText = document.querySelector(".browse-files");
let uploadIcon = document.querySelector(".upload-icon");
let dragDropText = document.querySelector(".dynamic-message");
let fileInput = document.querySelector("#fileInput");
let cannotUploadMessage = document.querySelector(".cannot-upload-message");
let cancelAlertButton = document.querySelector(".cancel-alert-button");
let uploadedFile = document.querySelector(".file-block");
let fileName = document.querySelector(".file-name");
let fileSize = document.querySelector(".file-size");
//let progressBar = document.querySelector(".progress-bar");
let removeFileButton = document.querySelector(".remove-file-icon");
let uploadButton = document.querySelector(".upload-button");
let otp_code = document.querySelector("#otp");
let fileFlag = 0;

fileInput.addEventListener("click", () => {
  fileInput.value = "";
  console.log(fileInput.value);
});

fileInput.addEventListener("change", (e) => {
  console.log(" > " + fileInput.value);
  uploadIcon.innerHTML = "check_circle";
  dragDropText.innerHTML = "File Dropped Successfully!";
  document.querySelector(
    ".label"
  ).innerHTML = `drag & drop or <span class="browse-files"> <input type="file" class="default-file-input" style=""/> <span class="browse-files-text" style="top: 0;"> browse file</span></span>`;
  // uploadButton.innerHTML = `Send <i class="mx-2 fa-solid fa-paper-plane"></i>`;
  //otp_code.innerHTML = `<div class="card mt-2 p-3 "><div class="d-flex justify-content-between align-items-center gap-3"><span> Your Key : 9867</span><a href="" class="text-decoration-none"><i class="fa-solid fa-copy fa-xl"></i></a></div></div>`;
  fileName.innerHTML = fileInput.files[0].name;
  fileSize.innerHTML = (fileInput.files[0].size / 1024).toFixed(1) + " KB";

  uploadedFile.style.cssText = "display: flex; ";

  fileFlag = 0;
});

uploadButton.addEventListener("click", () => {
  let isFileUploaded = fileInput.value;
  if (isFileUploaded != "") {
    startFileTransfer();
    if (fileFlag == 0) {
      fileFlag = 1;

      // var width = 0;
      // var id = setInterval(frame, 50);
      // function frame() {
      //   if (width >= 390) {
      //     clearInterval(id);
      //     uploadButton.innerHTML = `<span class="material-icons-outlined upload-button-icon"> check_circle </span> File Sent Successfully!  `;
      //   } else {
      //     width += 5;
      //     progressBar.style.width = width + "px";
      //   }
      // }
    }
  } else {
    cannotUploadMessage.style.cssText =
      "display: flex; animation: fadeIn linear 1.5s;";
  }
});

cancelAlertButton.addEventListener("click", () => {
  cannotUploadMessage.style.cssText = "display: none;";
});

if (isAdvancedUpload) {
  [
    "drag",
    "dragstart",
    "dragend",
    "dragover",
    "dragenter",
    "dragleave",
    "drop",
  ].forEach((evt) =>
    draggableFileArea.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
    })
  );

  ["dragover", "dragenter"].forEach((evt) => {
    draggableFileArea.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadIcon.innerHTML = "file_download";
      dragDropText.innerHTML = "Drop your file here!";
    });
  });

  draggableFileArea.addEventListener("drop", (e) => {
    uploadIcon.innerHTML = "check_circle";
    dragDropText.innerHTML = "File Dropped Successfully!";
    document.querySelector(
      ".label"
    ).innerHTML = `drag & drop or <span class="browse-files"> <input type="file" class="default-file-input" style=""/> <span class="browse-files-text" style="top: -23px; left: -20px;"> browse file</span> </span>`;

    // uploadButton.innerHTML = `Send <i class="mx-2 fa-solid fa-paper-plane"></i>`;

    let files = e.dataTransfer.files;
    fileInput.files = files;
    console.log(files[0].name + " " + files[0].size);
    console.log(document.querySelector(".default-file-input").value);
    fileName.innerHTML = files[0].name;
    fileSize.innerHTML = (files[0].size / 1024).toFixed(1) + " KB";
    uploadedFile.style.cssText = "display: flex;";
    progressBar.style.width = 0;
    fileFlag = 0;
  });
}

removeFileButton.addEventListener("click", () => {
  uploadedFile.style.cssText = "display: none;";
  fileInput.value = "";
  uploadIcon.innerHTML = "file_upload";
  dragDropText.innerHTML = "Drag & drop any file here";
  document.querySelector(
    ".label"
  ).innerHTML = `or <span class="browse-files"> <input type="file" class="default-file-input"/> <span class="browse-files-text">browse file</span> <span>from device</span> </span>`;
  // uploadButton.innerHTML = `Send <i class="mx-2 fa-solid fa-paper-plane"></i>`;

  location.reload();
});
