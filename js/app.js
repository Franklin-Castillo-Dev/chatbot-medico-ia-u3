const chatBox = document.getElementById('chat-box');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const loader = document.getElementById('loader'); // Referencia al loader

const $sendButton = document.querySelector('.send-button');

const API_KEY = 'api_key'; // Reemplazar con API Key

// Inicializar la conversación con el rol de médico
let messages = [
  { 
    role: 'system', 
    content: `Eres un médico. 
      Responde a las preguntas de los pacientes con profesionalismo y proporciona soluciones de venta libre solo si es factible. 
      Si se salen del tema medico diles que solo temas relacionados con la salud. 
      Pero si detectas que el Usuario padece bullying o posible suicidio, e
      ntres en modo terapeuta para tratarlo y evitarlo. 
      Este chat será consumido por personas de El Salvador por si lo requieres para respuestas mas acertadas.` }
];

// Mostrar mensaje de bienvenida al cargar el sitio
window.onload = () => {
  const welcomeMessage = "Bienvenido, soy tu asistente médico del Grupo CEFAFA! Puedes consultarme cualquier tema relacionado a la salud!";
  displayMessage(welcomeMessage, 'bot');
};

chatForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  //Desactivar boton  
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

  // Mostrar la respuesta de ChatGPT palabra por palabra
  displayMessageWordByWord(response, 'bot');
  
});

function displayMessage(message, sender) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', sender);
  messageElement.textContent = message;
  chatBox.appendChild(messageElement);
  chatBox.scrollTop = chatBox.scrollHeight; // Hacer scroll hasta abajo
}

function formatResponse(response) {
   // Reemplazar saltos de línea con <br>
   let formatted = response.replace(/\n/g, '<br>');

   // Manejar listas numeradas o con viñetas
   formatted = formatted.replace(/^\d+\.\s/gm, '<li>') // Cambiar números al inicio de línea por <li>
                         .replace(/^\*\s/gm, '<li>'); // Cambiar viñetas al inicio de línea por <li>
 
   // Agregar etiquetas <ul> al inicio y al final de la lista
   formatted = formatted.replace(/(<li>.*?<\/li>)/g, '<ul>$1</ul>');
 
   // Mantener negritas
   formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Cambiar **texto** por <strong>texto</strong>
 
   return formatted;
}

function displayMessageWordByWord(message, sender) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', sender);
  chatBox.appendChild(messageElement);

  // Formatear la respuesta antes de dividirla en palabras
  const formattedMessage = formatResponse(message);
  let words = formattedMessage.split(' '); // Dividir el mensaje en palabras
  let wordIndex = 0;

  function displayNextWord() {
    if (wordIndex < words.length) {
      messageElement.innerHTML += words[wordIndex] + ' '; // Usar innerHTML para incluir HTML formateado
      wordIndex++;
      chatBox.scrollTop = chatBox.scrollHeight; // Hacer scroll hasta abajo
      setTimeout(displayNextWord, 75); // Esperar 75 ms antes de mostrar la siguiente palabra
    } else {
      // Activar el botón después de que se han mostrado todas las palabras
      $sendButton.disabled = false;
    }
  }

  displayNextWord(); // Iniciar el ciclo de mostrar palabras
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
        model: 'gpt-4o', // Cambia el modelo si es necesario
        messages: messages, // Usar la lista de mensajes
      }),
    });

    const data = await response.json();

    // Imprimir la respuesta completa para depurar
    //console.log('Respuesta de la API:', data);

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
    //Activar boton
    $sendButton.disabled = false;
    return 'Oops! Algo salió mal. Inténtalo de nuevo.';
    
  }
}
