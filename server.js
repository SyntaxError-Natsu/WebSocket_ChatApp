const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage for messages (in production, use a database)
let messages = [];
let messageIdCounter = 1;

// Handle WebSocket connections
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    
    // Send existing messages to newly connected user
    socket.emit('load_messages', messages);
    
    // Handle new message
    socket.on('send_message', (data) => {
        const message = {
            id: messageIdCounter++,
            text: data.text,
            username: data.username,
            timestamp: new Date().toLocaleTimeString(),
            socketId: socket.id
        };
        
        messages.push(message);
        io.emit('new_message', message);
    });
    
    // Handle message update
    socket.on('update_message', (data) => {
        const messageIndex = messages.findIndex(msg => msg.id === data.id);
        if (messageIndex !== -1 && messages[messageIndex].socketId === socket.id) {
            messages[messageIndex].text = data.newText;
            messages[messageIndex].edited = true;
            io.emit('message_updated', messages[messageIndex]);
        }
    });
    
    // Handle message deletion
    socket.on('delete_message', (data) => {
        const messageIndex = messages.findIndex(msg => msg.id === data.id);
        if (messageIndex !== -1 && messages[messageIndex].socketId === socket.id) {
            messages.splice(messageIndex, 1);
            io.emit('message_deleted', data.id);
        }
    });
    
    // Handle user disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
