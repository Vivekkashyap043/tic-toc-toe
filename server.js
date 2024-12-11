const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // Allow cross-origin requests for frontend
        methods: ['GET', 'POST']
    }
});

// Dummy endpoint to keep the server alive
app.get('/keep-alive', (req, res) => {
    console.log('Ping received to keep server alive');
    res.send({ status: 'ok', message: 'Server is active' });
});

const rooms = {};

// Handle socket connection
io.on('connection', (socket) => {
    console.log(`A user connected: ${socket.id}`);

    // Create a new room
    socket.on('create_room', (roomId, callback) => {
        if (rooms[roomId]) {
            callback({ status: 'error', message: 'Room already exists' });
            return;
        }

        rooms[roomId] = { players: [socket.id] };
        socket.join(roomId);
        console.log(`Room created: ${roomId} by ${socket.id}`);
        callback({ status: 'ok', message: 'Room created', roomId });
    });

    // Join an existing room
    socket.on('join_room', (roomId, callback) => {
        if (!rooms[roomId]) {
            callback({ status: 'error', message: 'Room does not exist' });
            return;
        }

        if (rooms[roomId].players.length >= 2) {
            callback({ status: 'error', message: 'Room is full' });
            return;
        }

        rooms[roomId].players.push(socket.id);
        socket.join(roomId);
        console.log(`User ${socket.id} joined room ${roomId}`);
        io.to(roomId).emit('start_game', { message: 'Game started' });
        callback({ status: 'ok', message: 'Joined room', roomId });
    });

    // Handle game moves
    socket.on('make_move', ({ roomId, index, player }) => {
        if (!rooms[roomId]) {
            socket.emit('error', { message: 'Room does not exist' });
            return;
        }

        io.to(roomId).emit('move_made', { index, player });
        console.log(`Move made in room ${roomId}: Player ${player} at index ${index}`);
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        for (const roomId in rooms) {
            // Remove the user from the room
            rooms[roomId].players = rooms[roomId].players.filter((id) => id !== socket.id);

            // If the room is empty, delete it
            if (rooms[roomId].players.length === 0) {
                delete rooms[roomId];
                console.log(`Room ${roomId} deleted`);
            }
        }
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
