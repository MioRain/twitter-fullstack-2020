const form = document.getElementById('public-message-form');
const input = document.getElementById('messageInput');

form.addEventListener('submit', function (e) {
  e.preventDefault();
  if (input.value) {
    socket.emit('chat message', input.value);
    input.value = '';
  }
});