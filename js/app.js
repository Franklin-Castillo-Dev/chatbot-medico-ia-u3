const $chatBox = document.querySelector('#chat-box');
const $chatForm = document.querySelector('#chat-form');
const $userInput = document.querySelector('#user-input');
const $loader = document.querySelector('#loader'); // Referencia al $loader

const $sendButton = document.querySelector('#send-button');

const API_KEY = 'api_key'; // Reemplazar con API Key
const API_KEY_IP = 'api_key_ip'; // Reemplazar con API Key

const URL_IP = `https://ipinfo.io/?token=${API_KEY_IP}`;
const URL_OpenAI = 'https://api.openai.com/v1/chat/completions'; // POST

const URL_SAVE_DB = 'http://localhost:8080/api/preguntas'; // POST
const URL_RESPUESTA_DB = 'http://localhost:8080/api/preguntas/respuesta'; // POST
const URL_EXIST_DB = 'http://localhost:8080/api/preguntas/existe'; // POST


// Inicializar la conversación con el rol de médico
let messages = [];

// Mostrar mensaje de bienvenida al cargar el sitio
window.onload = async () => {
  let region = 'El Salvador';
  let city = 'El Salvador';

  try {
    const res_ip = await fetch(URL_IP);
    if (!res_ip.ok) {
      throw new Error('Error en la solicitud IP');
    }
    const json_ip = await res_ip.json();
    region = json_ip.region || 'El Salvador';
    city = json_ip.city || 'El Salvador';
  } catch (error) {
    console.error('No se pudo obtener la ubicación:', error);
  }

  messages.push(
    { 
      role: 'system', 
      content: `Eres un médico. 
        Responde a las preguntas de los pacientes con profesionalismo y proporciona soluciones de venta libre solo si es factible. 
        Si se salen del tema medico diles que solo temas relacionados con la salud. 
        Pero si detectas que el Usuario padece bullying o posible suicidio, 
        entres en modo terapeuta para tratarlo y evitarlo.
        Para respuestas más acertadas, La ubicación exacta del usuario es Región: ${region} y Ciudad: ${city} por si necesitas
        recomendarle unidades de salud al usuario, y si las ofreces, dile la direccion completa, no solo las enumeres, 
        y seas lo mas preciso posible.`
      }
  );

  const welcomeMessage = "Bienvenido, soy tu asistente médico del Grupo CEFAFA! Puedes consultarme cualquier tema relacionado a la salud!";
  displayMessage(welcomeMessage, 'bot');
};

$chatForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  //Desactivar boton  
  $sendButton.disabled = true;

  const userMessage = $userInput.value;

  // Mostrar mensaje del usuario en la pantalla
  displayMessage(userMessage, 'user');

  // Limpiar el campo de entrada
  $userInput.value = '';

  // Mostrar el $loader mientras se espera la respuesta
  $loader.style.display = 'block';

  const apiDbAvailable = await checkApiDbAvailability();

  let response;
  if (apiDbAvailable) {
    // Consumir la API de OpenAI Con Guardar
    response = await sendMessageToChatGPTandSave(userMessage);
  } else {
    console.log("La API de la base de datos no está disponible.");
    // Consumir la API de OpenAI Sin Guardar
    response = await sendMessageToChatGPT(userMessage);
  }
  

  // Ocultar el $loader cuando llega la respuesta
  $loader.style.display = 'none';

  // Mostrar la respuesta de ChatGPT palabra por palabra
  displayMessageWordByWord(response, 'bot');
  
});

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

//respuesta instantanea
function displayMessage(message, sender) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', sender);
  messageElement.textContent = message;
  $chatBox.appendChild(messageElement);
  $chatBox.scrollTop = $chatBox.scrollHeight; // Hacer scroll hasta abajo
}

// Simula respuesta escrita
function displayMessageWordByWord(message, sender) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', sender);
  $chatBox.appendChild(messageElement);

  // Formatear la respuesta antes de dividirla en palabras
  const formattedMessage = formatResponse(message);
  let words = formattedMessage.split(' '); // Dividir el mensaje en palabras
  let wordIndex = 0;

  function displayNextWord() {
    if (wordIndex < words.length) {
      messageElement.innerHTML += words[wordIndex] + ' '; // Usar innerHTML para incluir HTML formateado
      wordIndex++;
      $chatBox.scrollTop = $chatBox.scrollHeight; // Hacer scroll hasta abajo
      setTimeout(displayNextWord, 75); // Esperar 75 ms antes de mostrar la siguiente palabra
    } else {
      // Activar el botón después de que se han mostrado todas las palabras
      $sendButton.disabled = false;
    }
  }

  displayNextWord(); // Iniciar el ciclo de mostrar palabras
}

//Sin Guardar
async function sendMessageToChatGPT(userMessage) {
  try {
    // Agregar el mensaje del usuario a la lista de mensajes
    messages.push({ role: 'user', content: userMessage });

    const response = await fetch(URL_OpenAI, {
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

//Con Guardar
async function sendMessageToChatGPTandSave(userMessage) {
  try {
    // Agregar el mensaje del usuario a la lista de mensajes
    messages.push({ role: 'user', content: userMessage });

    // Consultar API interna para verificar si existe una respuesta guardada
    const existResponse = await fetch(URL_EXIST_DB, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pregunta: userMessage }),
    });

    const existsData = await existResponse.json();

    // Si la respuesta existe en la API interna, obtener la respuesta sin consultar OpenAI
    if (existsData === true) {
      const getDbAnswerResponse = await fetch(URL_RESPUESTA_DB, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pregunta: userMessage }),
      });

      const answerDbData = await getDbAnswerResponse.json();
      //console.log("answerDbData", answerDbData);
      const respuesta = answerDbData.respuesta || 'No se encontró una respuesta guardada';

      messages.push({ role: 'assistant', content: respuesta });
      return respuesta;
    }

    const openAIResponse = await fetch(URL_OpenAI, {
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
    
    const dataOpenAi = await openAIResponse.json();
    //console.log("dataOpenAi", dataOpenAi);

    // Verificar que choices esté presente y no vacío
    if (dataOpenAi.choices && dataOpenAi.choices.length > 0) {
      const openAIResponseContent = dataOpenAi.choices[0].message.content;
      messages.push({ role: 'assistant', content: openAIResponseContent });
      
      // Guardar la nueva pregunta y respuesta en la API interna
      await fetch(URL_SAVE_DB, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pregunta: userMessage,
          respuesta: openAIResponseContent,
        }),
      });

      return openAIResponseContent;
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

async function checkApiDbAvailability() {
  try {
    const response = await fetch(URL_EXIST_DB, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pregunta: 'check_api_availability' }) // Puedes enviar un valor dummy para probar la conexión
    });

    // Verificamos que la respuesta tenga un status en el rango 200-299
    if (response.ok) {
      return true; // La API está disponible
    } else {
      return false; // La API respondió pero con algún error
    }
  } catch (error) {
    console.error('Error al verificar la disponibilidad de la API:', error);
    return false; // Error en la conexión a la API
  }
}