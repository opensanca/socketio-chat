  // Conecta no socket
  const socket = io('http://localhost:3000');
  var messages = [];
  var users = [];
  var messagesTemplate = '';
  var usersTemplate = '';
  var private = false;
  var private_id = null;
  var privateConversations = []; 

  $(document).ready(() => {
      // Pré parseia o template de mensagens
      messagesTemplate = $('#mensagens-tmpl').html();
      Mustache.parse(messagesTemplate);

      // Pré parseia o template de usuarios
      usersTemplate = $('#users-tmpl').html();
      Mustache.parse(usersTemplate);

      // Pré parseia o template de novas mensagens privadas
      privatesTemplate = $('#privates-tmpl').html();
      Mustache.parse(privatesTemplate);


      // Função criada para facilitar a renderizacao de templates
      // do mustache.js
      // Aceita um template, dados e uma div target para renderizar
      let renderTemplate = function(template, data, target) {
          let rendered = Mustache.render(template, data);
          target.html(rendered);
      };

      // Ao conectar no socket, pedir um nome
      socket.on('connected', (data) => {
          let nome = prompt("Qual seu nome?", "");
          socket.emit('connected-ack', {nome});
          $('#nomeUsuario').html(nome);
      });

      // Ação de enviar mensagem
      $('#enviar').click(() => {
          let msg = $('#input-msg').val();
          if (!private) {
              socket.emit('new-message', {msg});
          } else {
              socket.emit('private-message', {to: private_id, msg: msg});
          }
          $('#input-msg').val('');
      });

      // Evento de receber uma nova mensagem
      socket.on('client-new-message', (data) => {
          renderTemplate(messagesTemplate, {messages: data.messages}, $('#mensagens-container'));
      });

      // Evento de novo usuário conectado
      socket.on('client-new-user', (data) => {
          renderTemplate(usersTemplate, {users: data.users}, $('#users-container'));
      });

      // Evento de novo usuário na sala
      socket.on('client-join-room', (data) => {
          renderTemplate(messagesTemplate, {messages: data.messages}, $('#mensagens-container'));
          renderTemplate(usersTemplate, {users: data.users}, $('#users-container'));
      });

      // Evento de usuário desconectado
      socket.on('client-user-disconnected', (data) => {
          renderTemplate(usersTemplate, {users: data.users}, $('#users-container'));
      });

      // Evento de entrar em sala privada
      socket.on('client-join-private-room', (data) => {
          renderTemplate(messagesTemplate, {messages: data.messages}, $('#mensagens-container'));
      });

      socket.on('client-private-message', (data) => {
          console.log('New Private Message Received!');
          console.log(data);

          conversation = _.find(privateConversations, (v) => {
              return v.id == data.id
          });

          if (conversation === undefined) {
              privateConversations.push(data);
          } else {
              conversation = data;
              conversation.hasNewMessage = true;
          }
          
          renderTemplate(privatesTemplate, {privates: privateConversations}, $('#privates-container'));
      });

      // Mudança de sala
      $(document).on('click', '.sala', (event) => {
          console.log(event.target);
          socket.emit('join-room', {id: $(event.target).attr('room')});
          private = false;
          private_id = null;
          $('#salaAtual').html(`Sala ${$(event.target).attr('room')}`);
      })

      $(document).on('click', '.user-item', (event) => {
          console.log($(event.target).attr('socket'));
          socket.emit('join-room', {id: $(event.target).attr('socket'), nome: $(event.target).attr('nome'), private: true});
          private = true;
          private_id = $(event.target).attr('socket');
          $('#salaAtual').html(`Conversa privada com ${$(event.target).attr('nome')}`);
      })

      $(document).on('click', '.private-item', (event) => {

          let private_id = $(event.target).attr('privateid');

          conversation = _.find(privateConversations, (v) => {
              return v.id == private_id
          });

          renderTemplate(messagesTemplate, {messages: conversation.messages}, $('#mensagens-container'));
          // $('#salaAtual').html(`Conversa privada com ${$(event.target).attr('nome')}`);
      })
  });