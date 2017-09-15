// Bootstrap inicial de um app usando express.js
const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
let _ = require('underscore');
app.use('/modules', express.static(__dirname + '/node_modules/'));
app.use('/assets', express.static(__dirname + '/assets/'));
server.listen(3000);


// endpoint que serve o index.html
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

app.get('/bonito', function (req, res) {
  res.sendFile(__dirname + '/bonito.html');
});

// variavel que guarda as mensagens enviadas pelos usuarios
// com a estrutura {from: string, msg: string}
let messages = {};
let privateMessages = [];
let users = {};

// função para gerenciar os eventos recebidos e enviados pelo socket
io.on('connection', function (socket) {
  // Entra na sala Global por padrao
  socket.join('global');
  socket.room = 'global';

  // Cria array de mensagens da sala se nao existir
  if (messages[socket.room] === undefined) {
    messages[socket.room] = [];
  }

  if (users[socket.room] === undefined) {
    users[socket.room] = [];
  }
  
  // Mensagem enviada para todos que conectarem
  socket.emit('connected', { msg: 'test' });
  
  // Mensagem recebida do usuario com seu nome
  socket.on('connected-ack', function (data) {
    // É possível guardar qualquer variavel no socket
    // entao guardaremos o nome
    socket.nome = data.nome;
    // Inserimos o novo usuario na sua devida sala; Usado para a lista de usuarios
    users[socket.room].push({nome: socket.nome, socket_id: socket.id});
    io.in(socket.room).emit('client-new-user', {users: users[socket.room]});
  });

  // Recebe uma mensagem enviada por um usuario e guarda
  // numa variavel global com todas as mensagens (messages)
  socket.on('new-message', (data) => {
    // Adiciona a mensagem no array de mensagens
    messages[socket.room].push({from: socket.nome, msg: data.msg})

    // socket.broadcast envia mensagem pra todos os usuários
    // menos o que mandou
    // socket.broadcast.emit('client-new-message', {messages});

    // envia a nova mensagem para a sala
    io.in(socket.room).emit('client-new-message', {messages: messages[socket.room]});
    
  });

  socket.on('join-room', (data) => {
    // Sai da sala atual
    if (socket.room != null && socket.room != undefined) {
      socket.leave(socket.room);
    }

    console.log(`Usuario ${socket.nome} saindo da sala ${socket.room}`);

    // Remove socket da array de usuarios daquela sala
    if (socket.room != null && socket.room != undefined) {
      users[socket.room] = users[socket.room].filter((v) => {
        return v.socket_id !== socket.id
      });
    }

    // Emite um evento para atualizar as informacoes de sala dos outros usuarios
    io.in(socket.room).emit('client-user-disconnected', {users: users[socket.room]});

    socket.room = null;

    if (!data.private) {
      // Entra na nova sala
      socket.join(data.id);
      socket.room = data.id;

      console.log(`Usuario ${socket.nome} entrou na sala ${socket.room}`);

      // Cria lista de mensagens/salas se nao estiverem criadas
      if (messages[socket.room] === undefined) {
        messages[socket.room] = [];
      }

      if (users[socket.room] === undefined) {
        users[socket.room] = [];
      }

      // Adiciona usuario na nova sala
      users[socket.room].push({nome: socket.nome, socket_id: socket.id})
      // Emite evento com informacoes de mensagens e usuarios da nova sala
      io.in(socket.room).emit('client-join-room', {messages: messages[socket.room], users: users[socket.room]});
    } else {

      // Procura a conversa onde tem os dois usuarios
      let conversation = _.find(privateMessages, (v) => {
        return (_.contains(v.users, data.id) && _.contains(v.users, socket.id));
      });

      // Se a conversa não foi encontrada, temos que criar uma nova
      if (conversation === undefined) {
        let conversation_id = data.id + '_' + socket.id;
        conversation = {users: [data.id, socket.id], messages: [], id: conversation_id};
        privateMessages.push(conversation);
      }

      // Emite o objeto de conversa
      socket.emit('client-join-private-room', {messages: conversation.messages, id: conversation.id})
    }

  });

  socket.on('private-message', function (data) {
    let conversation = _.find(privateMessages, (v) => {
      return (_.contains(v.users, data.to) && _.contains(v.users, socket.id));
    });

    conversation.messages.push({from: socket.nome, msg: data.msg});

    socket.to(data.to).emit('client-private-message', conversation);
  });

  // Evento disparado quando usuário desconecta do socket (cai internet, fecha aba)
  socket.on('disconnect', function () {
    if (socket.room !== undefined && socket.room !== null) {
      // Remove socket da array de usuarios daquela sala
      users[socket.room] = users[socket.room].filter((v) => {
        return v.socket_id !== socket.id
      });

      // Emite um evento para atualizar as informacoes de sala dos outros usuarios
      io.in(socket.room).emit('client-user-disconnected', {users: users[socket.room]});
    }
  });
});