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
    pingInterval: 25000, // Send a ping every 25 seconds to keep the connection alive
    pingTimeout: 60000, // Wait 60 seconds before timing out
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
            rooms[roomId] = { players: [socket.id], board: Array(9).fill(null) };
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
            io.to(roomId).emit('opponent_joined'); // Notify room that opponent has joined
        }
    });

    socket.on('make_move', ({ roomId, index, player }) => {
        console.log(`Move made in room ${roomId}:`, { index, player });
        if (rooms[roomId]) {
            rooms[roomId].board[index] = player;
            socket.to(roomId).emit('move_made', { index, player });
        }
    });

    socket.on('reset_game', (roomId) => {
        if (rooms[roomId]) {
            rooms[roomId].board = Array(9).fill(null);
            io.to(roomId).emit('game_reset');
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
