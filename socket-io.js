const express = require('express');
const app = require('./app')
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const { User } = require('./models')


io.on('connection', (socket) => {
  console.log('a user connected');
});

module.exports = io