const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const rooms = {};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('create_room', (roomId) => {
        rooms[roomId] = { players: [socket.id] };
        socket.join(roomId);
    });

    socket.on('join_room', (roomId) => {
        if (rooms[roomId] && rooms[roomId].players.length < 2) {
            rooms[roomId].players.push(socket.id);
            socket.join(roomId);
            io.to(roomId).emit('start_game');
        } else {
            socket.emit('room_full');
        }
    });

    socket.on('make_move', ({ roomId, index, player }) => {
        io.to(roomId).emit('move_made', { index, player });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        for (const roomId in rooms) {
            rooms[roomId].players = rooms[roomId].players.filter((id) => id !== socket.id);
        }
    });
});

server.listen(3000, () => console.log('Server running on http://localhost:3000'));
