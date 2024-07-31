document.addEventListener('DOMContentLoaded', function () {
    const createRoomBtn = document.getElementById("createRoomBtn");
    const joinRoomBtn = document.getElementById("joinRoomBtn");

    joinRoomBtn.addEventListener("click", () => {
        const roomId = document.getElementById('roomId').value;
        joinRoom(roomId);
    });
    

    async function joinRoom(roomId) {
        await connection.invoke("JoinRoom", roomId);
        setupPeerConnection(roomId);
    }

    function createRoom() {
        
    }
});
