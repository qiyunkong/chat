// 引入模块
const express = require('express');
const path = require('path');
const socketio = require('socket.io');
const http = require('http');
const formatMessage = require('./utils/message');
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require('./utils/users.js');

// 初始化
const app = express();
const server = http.createServer(app);
const io = socketio(server);

// 设置静态文件
app.use(express.static(path.join(__dirname, 'public')));

const botName = '米修小助手';
// 监听客户端是否触发连接
io.on('connection', (socket) => {
  // console.log('websocket已连接...');
  // 监听加入房间事件
  socket.on('joinRoom', ({ username, room }) => {
    const user = userJoin(socket.id, username, room);
    // console.log(user);
    socket.join(user.room);
    // 消息一对一发送
    socket.emit('message', formatMessage(botName, '欢迎加入米修课堂聊天室'));
    // 消息的广播(除了自身以外其他的客户端都可以收到)
    socket.broadcast
      .to(user.room)
      .emit('message', formatMessage(botName, `欢迎${user.username}加入聊天`));
    // 发送用户和房间信息给客户端
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room),
    });
  });

  // 监听客户端的聊天消息（chatMessage）
  socket.on('chatMessage', (msg) => {
    const user = getCurrentUser(socket.id);
    io.to(user.room).emit('message', formatMessage(user.username, msg));
  });
  // 监听客户端是否断开连接（所有用户都可以收到消息）
  socket.on('disconnect', () => {
    const user = userLeave(socket.id);
    if (user) {
      io.to(user.room).emit(
        'message',
        formatMessage(botName, `${user.username}已经下线`)
      );

      // 发送用户和房间信息给客户端
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    }
  });
});
// 端口号
const PORT = process.env.PORT || 5000;

// 监听端口号
server.listen(PORT, () => {
  console.log(`App listening on port ${PORT}!`);
});
