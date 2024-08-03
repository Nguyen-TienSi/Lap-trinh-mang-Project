import { db } from "./firebaseConfig.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

/*------------------------*/
const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};

const mediaStreamConstraints = {
  video: true,
  audio: true,
};

let localVideo = document.getElementById("local");
let remoteVideo = document.getElementById("remote");
let roomIdInput = document.getElementById("room-id");
let webcamBtn = document.getElementById("webcamBtn");
let createBtn = document.getElementById("createBtn");
let joinBtn = document.getElementById("joinBtn");
let hangupBtn = document.getElementById("hangupBtn");
let localStream = null;
let remoteStream = null;
let peerConnection = null;
let roomId = null;

/*-------------------------*/
async function init() {
  hangupBtn.disabled = true;

  localStream = await navigator.mediaDevices.getUserMedia(
    mediaStreamConstraints
  );

  remoteStream = new MediaStream();

  peerConnection = new RTCPeerConnection(servers);

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  localVideo.srcObject = localStream;
  remoteVideo.srcObject = remoteStream;
}

async function createRoom() {
  joinBtn.disabled = true;
  createBtn.disabled = true;

  const offerDescription = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offerDescription);

  const offer = {
    offer: {
      type: offerDescription.type,
      sdp: offerDescription.sdp,
    },
  };

  const roomDoc = doc(collection(db, "rooms"));
  const offerCandidates = collection(roomDoc, "offerCandidates");
  const answerCandidates = collection(roomDoc, "answerCandidates");
  roomIdInput.value = roomId = roomDoc.id;

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      addDoc(offerCandidates, event.candidate.toJSON());
    }
  };

  await setDoc(roomDoc, offer);

  onSnapshot(roomDoc, (snapshot) => {
    const data = snapshot.data();
    if (!peerConnection.currentRemoteDescription && data?.answer) {
      const answerDescription = new RTCSessionDescription(data.answer);
      peerConnection.setRemoteDescription(answerDescription);
    }
  });

  collectICECandidates(answerCandidates);
}

async function joinRoom() {
  createBtn.disabled = true;
  joinBtn.disabled = true;

  roomId = roomIdInput.value;
  const roomDoc = doc(db, "rooms", roomId);
  const offerCandidates = collection(roomDoc, "offerCandidates");
  const answerCandidates = collection(roomDoc, "answerCandidates");

  const offerDescription = (await getDoc(roomDoc)).data().offer;
  await peerConnection.setRemoteDescription(offerDescription);

  const answerDescription = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answerDescription);

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      addDoc(answerCandidates, event.candidate.toJSON());
    }
  };

  const answer = {
    answer: {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    },
  };

  await updateDoc(roomDoc, answer);

  collectICECandidates(offerCandidates);
}

function collectICECandidates(ICECandidates) {
  hangupBtn.disabled = false;

  onSnapshot(ICECandidates, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const candidate = new RTCIceCandidate(change.doc.data());
        peerConnection.addIceCandidate(candidate);
      }
    });
  });
}

async function hangUp() {
  const stopTracks = (stream) => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  };

  stopTracks(localVideo.srcObject);
  stopTracks(remoteStream);

  if (peerConnection) {
    peerConnection.close();
  }

  if (roomId) {
    const roomDoc = doc(db, "rooms", roomId);
    const offerCandidates = collection(roomDoc, "offerCandidates");
    const answerCandidates = collection(roomDoc, "answerCandidates");

    const deleteCandidates = async (collection) => {
      const candidates = await getDocs(collection);
      candidates.forEach(async (candidate) => {
        await deleteDoc(candidate.ref);
      });
    };

    await Promise.all([
      deleteCandidates(offerCandidates),
      deleteCandidates(answerCandidates),
    ]);
    await deleteDoc(roomDoc);
  }

  document.location.reload(true);
}

function toggleCamera() {
  let videoTrack = localStream
    .getTracks()
    .find((track) => track.kind === "video");
  if (videoTrack.enabled) {
    videoTrack.enabled = false;
  } else {
    videoTrack.enabled = true;
  }
}

/*----------------------*/
webcamBtn.addEventListener("click", toggleCamera);
createBtn.addEventListener("click", createRoom);
joinBtn.addEventListener("click", joinRoom);
hangupBtn.addEventListener("click", hangUp);

/*---------------------*/
init();
