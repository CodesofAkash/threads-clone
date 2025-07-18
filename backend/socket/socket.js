import {Server} from 'socket.io'
import http from 'http'
import express from 'express'

import Message from '../models/messageModel.js'
import Conversation  from '../models/ConversationModel.js'

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production' 
            ? process.env.FRONTEND_URL || "http://localhost:3000"
            : ["http://localhost:3000", "http://localhost:5173"],
        methods: ["GET", "POST"]
    }
});

export const getRecipientSocketId = (recipientId) => {
    return userSocketMap[recipientId];
}

const userSocketMap = {}

io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    if(userId !== "undefined") userSocketMap[userId] = socket.id;
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    socket.on("markMessagesAsSeen", async ({conversationId, userId}) => {
        try {
            await Message.updateMany({conversationId: conversationId, seen: false}, {$set: {seen: true} });
            await Conversation.updateOne({_id: conversationId}, {$set: {"lastMessage.seen": true}});
            io.to(userSocketMap[userId]).emit("messagesSeen", {conversationId});
        } catch (error) {
            // Handle error silently
        }
    })

    socket.on('disconnect', () => {
        delete userSocketMap[userId];
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    })
});

export {io, server, app};