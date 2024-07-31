

//Start call
document.getElementById('startCallBtn').addEventListener('click', async function ()
{
    if (!localStream)
    {
        console.error('Local stream not available.Please start your camera first.');
        return confirm('Local stream not available.Please start your camera and mic.');
    }
    try
    {
        peerConnection = new RTCPeerConnection(configuration);
        peerConnection.onicecandidate = event =>
        {
            if (event.candidate)
            {
                connection.invoke('SendMessage', roomIdInput.value, JSON.stringify({ type: 'candidate', candidate: event.candidate }));
            }
        };
        peerConnection.ontrack = event =>
        {
            if (!remoteStream)
            {
                remoteStream = new MediaStream();
                document.getElementById('remoteVideo').srcObject = remoteStream;
            }
            remoteStream.addTrack(event.track);
        };
        localStream.getTracks().forEach(track =>
        {
            peerConnection.addTrack(track, localStream);
        });
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        console.log('Offer:', offer);
    } catch (error)
    {
        console.error('Error creating peer connection:', error);
    }
});

async function initLocalStream()
{
    try
    {
        // Yêu cầu quyền truy cập media devices và gán stream vào video element
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById('localVideo').srcObject = localStream;
    } catch (error)
    {
        console.error('Error accessing media devices:', error);
    }
}
window.addEventListener('load', initLocalStream);


connection.on("ReceiveMessage", async message =>
{
    const data = JSON.parse(message);
    if (data.type === "offer")
    {
        await handleOffer(data);
    } else if (data.type === "answer")
    {
        await handleAnswer(data);
    } else if (data.type === "candidate")
    {
        await handleCandidate(data);
    }
});


async function startLocalStream()
{
    try
    {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
    } catch (error)
    {
        console.error('Error accessing media devices.', error);
        localStream = null;
    }
}

function setupPeerConnection(roomId)
{
    const peerConnection = new RTCPeerConnection(configuration);
    peerConnections[roomId] = peerConnection;

    peerConnection.onicecandidate = event =>
    {
        if (event.candidate)
        {
            connection.invoke("SendMessage", roomId, JSON.stringify({ type: "candidate", candidate: event.candidate }));
        }
    };

    peerConnection.ontrack = event =>
    {
        if (event.streams && event.streams.length > 0)
        {
            const remoteStream = new MediaStream();
            remoteStreams.push(remoteStream);

            const remoteVideo = document.createElement("video");
            remoteVideo.srcObject = remoteStream;
            remoteVideo.autoplay = true;
            remoteVideo.controls = true;
            remoteVideosContainer.appendChild(remoteVideo);

            event.streams[0].getTracks().forEach(track =>
            {
                remoteStream.addTrack(track);
            });
        } else
        {
            console.error('No streams received in ontrack event:', event);
        }
    };

    if (localStream)
    {
        localStream.getTracks().forEach(track =>
        {
            peerConnection.addTrack(track, localStream);
        });
    } else
    {
        console.error('Local stream is not available');
    }
}


async function handleOffer(data, peerConnection)
{
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    connection.invoke("SendMessage", roomIdInput.value, JSON.stringify({ type: "answer", sdp: answer.sdp }));
}

async function handleAnswer(data, peerConnection)
{
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
}

async function handleCandidate(data, peerConnection)
{
    await peerConnection.addIceCandidate(new RTCIceCandidate(data));
}

connection.start().catch(err => console.error('SignalR connection error:', err));
