const roomName = "example_room"; // You can dynamically generate the room name as needed
const socket = new WebSocket(
  "ws://" + window.location.host + "/ws/signal/" + roomName + "/"
);
let peerConnection = null;
let senderChannelId = null;

// Handle incoming WebSocket messages
let pendingCandidates = [];
let receivedBuffers = [];

socket.onmessage = function (e) {
  const data = JSON.parse(e.data);

  if (data.signal) {
    if (!peerConnection) {
      createPeerConnection();
    }
    handleSignalingMessage(data.signal);
  }
};

function submitOTP() {
  const otp = document.getElementById("otpInput").value;
  socket.send(JSON.stringify({ otp: otp }));
  // document.getElementById("status").innerText = "Connecting...";
}

function createPeerConnection() {
  peerConnection = new RTCPeerConnection();
  peerConnection.ondatachannel = handleDataChannel;
  peerConnection.onicecandidate = handleIceCandidate;
}

function handleDataChannel(event) {
  const receiveChannel = event.channel;
  receiveChannel.onmessage = handleFileReceive;
  receiveChannel.onopen = () => {
    console.log("Data channel opened");
    //   document.querySelector("cannot-upload-message").innerText =
    //     "Connected. Waiting for file...";
  };
}

function handleIceCandidate(event) {
  if (event.candidate) {
    sendSignal({
      type: "ice_candidate",
      ice_candidate: event.candidate,
    });
  }
}

const progressBar = document.querySelector(".progress-bar");
function handleFileReceive(event) {
  if (typeof event.data === "string") {
    // This is the metadata
    fileMetadata = JSON.parse(event.data);
    progressBar.value = 0; // Initialize progress
    progressBar.max = 100;
    // document.getElementById(
    //   "status"
    // ).innerText = `Receiving file: ${fileMetadata.fileName}`;
    fileName.innerHTML = fileMetadata.fileName;
    uploadedFile.style.cssText = "display: flex;";
  } else {
    // This is file data
    receivedBuffers.push(event.data);

    // Check if all chunks have been received
    const received = receivedBuffers.reduce(
      (acc, chunk) => acc + chunk.byteLength,
      0
    );
    const progress = (received / fileMetadata.fileSize) * 100;
    progressBar.value = progress;
    document.getElementsByClassName(
      "progress-bar"
    ).innerText = `Transferred: ${Math.round(progressBar.value)}%`;

    document.querySelector(
      ".upload-button"
    ).innerText = `Downloading  ${Math.round(progressBar.value)}%`;
    var width = 0;
    var id = setInterval(frame, 50);
    function frame() {
      if (progressBar.value === 100) {
        clearInterval(id);
        uploadButton.innerHTML = `<span class="material-icons-outlined upload-button-icon"> check_circle </span> <span>Downloaded Successfully! </span> `;
        uploadButton.style.backgroundColor = "green";
        uploadButton.disabled = true;
        uploadButton.style.cursor = "auto";
      } else {
        progressBar.style.width = Math.round(progressBar.value) + "%";
      }
    }

    if (received === fileMetadata.fileSize) {
      const receivedBlob = new Blob(receivedBuffers, {
        type: fileMetadata.fileType,
      });
      downloadFile(receivedBlob);
      // Reset for next file
      receivedBuffers = [];
      fileMetadata = null;
    }
  }
}

function downloadFile(blob) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileMetadata.fileName;
  link.click();
  URL.revokeObjectURL(link.href);
  // document.getElementById(
  //   "status"
  // ).innerText = `File received and downloaded: ${fileMetadata.fileName}`;
}

function sendSignal(signal) {
  socket.send(
    JSON.stringify({
      signal: signal,
      target: senderChannelId,
    })
  );
}

function handleSignalingMessage(signal) {
  if (signal.type === "offer") {
    peerConnection
      .setRemoteDescription(new RTCSessionDescription(signal))
      .then(() => peerConnection.createAnswer())
      .then((answer) => peerConnection.setLocalDescription(answer))
      .then(() => {
        sendSignal({
          type: "answer",
          sdp: peerConnection.localDescription.sdp,
        });
        // Add any pending candidates
        pendingCandidates.forEach((candidate) =>
          peerConnection.addIceCandidate(candidate)
        );
        pendingCandidates = [];
      })
      .catch((error) => {
        console.error("Error handling offer:", error);
        document.querySelector(".cannot-upload-message").innerHTML =
          "Oops Something Went Wrong!";
      });
  } else if (signal.type === "ice_candidate") {
    const iceCandidate = new RTCIceCandidate(signal.ice_candidate);
    if (peerConnection.remoteDescription) {
      peerConnection
        .addIceCandidate(iceCandidate)
        .then(() => console.log("ICE candidate added successfully"))
        .catch((error) => {
          console.error("Error adding ICE candidate:", error);
          document.querySelector(".cannot-upload-message").innerText =
            "Oops Something Went Worng ! Try Again";
        });
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

// var isAdvancedUpload = (function () {
//   var div = document.createElement("div");
//   return (
//     ("draggable" in div || ("ondragstart" in div && "ondrop" in div)) &&
//     "FormData" in window &&
//     "FileReader" in window
//   );
// })();

let draggableFileArea = document.querySelector(".drag-file-area");
let browseFileText = document.querySelector(".browse-files");
let uploadIcon = document.querySelector(".upload-icon");
let dragDropText = document.querySelector(".dynamic-message");
let fileInput = document.querySelector(".default-file-input");
let cannotUploadMessage = document.querySelector(".cannot-upload-message");
let cancelAlertButton = document.querySelector(".cancel-alert-button");
let uploadedFile = document.querySelector(".file-block");
let fileName = document.querySelector(".file-name");
let fileSize = document.querySelector(".file-size");
// let progressBar = document.querySelector(".progress-bar");
let removeFileButton = document.querySelector(".remove-file-icon");
let uploadButton = document.querySelector(".upload-button");
let otp_code = document.querySelector("#otp");
let fileFlag = 0;

// fileInput.addEventListener("click", () => {
//   fileInput.value = "";
//   console.log(fileInput.value);
// });

// fileInput.addEventListener("change", (e) => {
//   console.log(" > " + fileInput.value);
//   uploadIcon.innerHTML = "check_circle";
//   dragDropText.innerHTML = "File Dropped Successfully!";
//   document.querySelector(
//     ".label"
//   ).innerHTML = `drag & drop or <span class="browse-files"> <input type="file" class="default-file-input" style=""/> <span class="browse-files-text" style="top: 0;"> browse file</span></span>`;
//   uploadButton.innerHTML = `Send <i class="mx-2 fa-solid fa-paper-plane"></i>`;
//   otp_code.innerHTML = `<div class="card mt-2 p-3 "><div class="d-flex justify-content-between align-items-center gap-3"><span> Your Key : 9867</span><a href="" class="text-decoration-none"><i class="fa-solid fa-copy fa-xl"></i></a></div></div>`;
//   fileName.innerHTML = fileInput.files[0].name;
//   fileSize.innerHTML = (fileInput.files[0].size / 1024).toFixed(1) + " KB";
//   uploadedFile.style.cssText = "display: flex;";
//   progressBar.style.width = 0;
//   fileFlag = 0;
// });

// uploadButton.addEventListener("click", () => {
//   let isFileUploaded = fileInput.value;
//   if (isFileUploaded != "") {
//     if (fileFlag == 0) {
//       fileFlag = 1;
//     }
//   } else {
//     cannotUploadMessage.style.cssText =
//       "display: flex; animation: fadeIn linear 1.5s;";
//   }
// });

cancelAlertButton.addEventListener("click", () => {
  cannotUploadMessage.style.cssText = "display: none;";
});

// if (isAdvancedUpload) {
//   [
//     "drag",
//     "dragstart",
//     "dragend",
//     "dragover",
//     "dragenter",
//     "dragleave",
//     "drop",
//   ].forEach((evt) =>
//     draggableFileArea.addEventListener(evt, (e) => {
//       e.preventDefault();
//       e.stopPropagation();
//     })
//   );

//   ["dragover", "dragenter"].forEach((evt) => {
//     draggableFileArea.addEventListener(evt, (e) => {
//       e.preventDefault();
//       e.stopPropagation();
//       uploadIcon.innerHTML = "file_download";
//       dragDropText.innerHTML = "Drop your file here!";
//     });
//   });

//   draggableFileArea.addEventListener("drop", (e) => {
//     uploadIcon.innerHTML = "check_circle";
//     dragDropText.innerHTML = "File Dropped Successfully!";
//     document.querySelector(
//       ".label"
//     ).innerHTML = `drag & drop or <span class="browse-files"> <input type="file" class="default-file-input" style=""/> <span class="browse-files-text" style="top: -23px; left: -20px;"> browse file</span> </span>`;

//     uploadButton.innerHTML = `Send <i class="mx-2 fa-solid fa-paper-plane"></i>`;

//     let files = e.dataTransfer.files;
//     fileInput.files = files;
//     console.log(files[0].name + " " + files[0].size);
//     console.log(document.querySelector(".default-file-input").value);
//     fileName.innerHTML = files[0].name;
//     fileSize.innerHTML = (files[0].size / 1024).toFixed(1) + " KB";
//     uploadedFile.style.cssText = "display: flex;";
//     progressBar.style.width = 0;
//     fileFlag = 0;
//   });
// }

// removeFileButton.addEventListener("click", () => {
//   uploadedFile.style.cssText = "display: none;";
//   fileInput.value = "";
//   uploadIcon.innerHTML = "file_upload";
//   dragDropText.innerHTML = "Drag & drop any file here";
//   document.querySelector(
//     ".label"
//   ).innerHTML = `or <span class="browse-files"> <input type="file" class="default-file-input"/> <span class="browse-files-text">browse file</span> <span>from device</span> </span>`;
//   uploadButton.innerHTML = `Send <i class="mx-2 fa-solid fa-paper-plane"></i>`;

//   location.reload();
// });
