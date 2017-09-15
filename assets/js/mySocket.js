  // Conecta no socket
            const socket = io('http://localhost:3000');
            var messages = [];
            var users = [];
            var messagesTemplate = '';
            var usersTemplate = '';

            $(document).ready(() => {
                // Pré parseia o template de mensagens
                messagesTemplate = $('#mensagens-tmpl').html();
                Mustache.parse(messagesTemplate);

                // Pré parseia o template de usuarios
                usersTemplate = $('#users-tmpl').html();
                Mustache.parse(usersTemplate);


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
                    socket.emit('new-message', {msg});
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

                // Mudança de sala
                $('.sala').click((event) => {
                    socket.emit('join-room', {id: $(event.target).attr('room')});
                    $('#salaAtual').html(`Sala ${$(event.target).attr('room')}`);
                })
            });