const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

const rooms = {};

// Dummy endpoint to keep the server alive
app.get('/keep-alive', (req, res) => {
    console.log('Ping received to keep server alive');
    res.send({ status: 'ok', message: 'Server is active' });
});

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('create_room', (roomId, callback) => {
        console.log(`Create room requested: ${roomId}`);
        if (rooms[roomId]) {
            callback({ status: 'error', message: 'Room already exists' });
        } else {
            rooms[roomId] = { players: [socket.id] };
            socket.join(roomId);
            callback({ status: 'ok', roomId });
        }
    });

    socket.on('join_room', (roomId, callback) => {
        console.log(`Join room requested: ${roomId}`);
        if (!rooms[roomId]) {
            callback({ status: 'error', message: 'Room does not exist' });
        } else if (rooms[roomId].players.length >= 2) {
            callback({ status: 'error', message: 'Room is full' });
        } else {
            rooms[roomId].players.push(socket.id);
            socket.join(roomId);
            callback({ status: 'ok', roomId });
        }
    });

    socket.on('make_move', ({ roomId, index, player }) => {
        console.log(`Move made in room ${roomId}:`, { index, player });
        socket.to(roomId).emit('move_made', { index, player });
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
