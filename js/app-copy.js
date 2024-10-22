//Version sin Escritura palabra a palabra
const chatBox = document.getElementById('chat-box');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const loader = document.getElementById('loader'); // Referencia al loader

const API_KEY = 'api_key'; // Reemplaza con tu propia API Key

// Inicializar la conversación con el rol de médico
let messages = [
  { role: 'system', content: 'Eres un médico. Responde a las preguntas de los pacientes con profesionalismo y proporciona soluciones de venta libre solo si es factible. Si se salen del tema medico diles que solo temas relacionados con la salud.' }
];

// Mostrar mensaje de bienvenida al cargar el sitio
window.onload = () => {
  const welcomeMessage = "Bienvenido, soy tu asistente médico, puedes consultarme cualquier tema relacionado a la salud!";
  displayMessage(welcomeMessage, 'bot');
};

chatForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  // Desactivar botón
  const $sendButton = document.querySelector('.send-button');
  $sendButton.disabled = true;

  const userMessage = userInput.value;

  // Mostrar mensaje del usuario en la pantalla
  displayMessage(userMessage, 'user');

  // Limpiar el campo de entrada
  userInput.value = '';

  // Mostrar el loader mientras se espera la respuesta
  loader.style.display = 'block';

  // Consumir la API de OpenAI
  const response = await sendMessageToChatGPT(userMessage);

  // Ocultar el loader cuando llega la respuesta
  loader.style.display = 'none';

  // Mostrar la respuesta de ChatGPT completa
  displayMessage(response, 'bot');

  // Activar botón
  $sendButton.disabled = false;
});

function displayMessage(message, sender) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', sender);
  messageElement.textContent = message;
  chatBox.appendChild(messageElement);
  chatBox.scrollTop = chatBox.scrollHeight; // Hacer scroll hasta abajo
}

async function sendMessageToChatGPT(userMessage) {
  try {
    // Agregar el mensaje del usuario a la lista de mensajes
    messages.push({ role: 'user', content: userMessage });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4', // Cambia el modelo si es necesario
        messages: messages, // Usar la lista de mensajes
      }),
    });

    const data = await response.json();

    // Verificar que choices esté presente y no vacío
    if (data.choices && data.choices.length > 0) {
      // Agregar la respuesta del bot a la lista de mensajes
      messages.push({ role: 'assistant', content: data.choices[0].message.content });
      return data.choices[0].message.content;
    } else {
      return 'No se recibió una respuesta válida de la API.';
    }
  } catch (error) {
    console.error('Error:', error);
    return 'Oops! Algo salió mal. Inténtalo de nuevo.';
  }
}
