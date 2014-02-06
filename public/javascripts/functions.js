var socket = io.connect('http://localhost:3000');
 
// Al actualizar la página eliminamos la sesión del usuario de sessionStorage
$(document).ready(function()
{
    manageSessions.unset("login");
});
 

// Función para mantener el scroll siempre al final del div donde se muestran 
// los mensajes con una pequeña animación (JQuery)
function animateScroll()
{
    var container = $('#containerMessages');
    container.animate({"scrollTop": $('#containerMessages')[0].scrollHeight}, "slow");
}
 

// Función anónima con todas las funcionalidades del chat (lo que se comunica
//  con socket.io)
$(function()
{
    // Llamamos a la función que mantiene el scroll al fondo
    animateScroll();

    // Si el usuario no ha iniciado sesión prevenimos que pueda acceder
    showModal("Formulario de inicio de sesión", renderForm());

    // Focus en el TextBox Username
    $(".username").focus();

    // Al poner el foco en el campo de texto del mensaje o al pulsar el botón de enviar
    $("#containerSendMessages, #containerSendMessages input").on("focus click", function(e)
    {
        e.preventDefault();
        if ( !manageSessions.get("login") ) {
            showModal("Formulario de inicio de sesión",renderForm(), false);
        }
    });
 
    // Al pulsar en el botón de Entrar 
    $("#loginBtn").on("click", function(e)
    {
        e.preventDefault();
        // Si el nombre de usuario es menor de 2 carácteres
        if($(".username").val().length < 2) {
            // Ocultamos el mensaje de error
            $(".errorMsg").hide();
            // Mostramos el mensaje de nuevo y ponemos el foco en el campo de texto
            $(".username").after("<div class='col-md-12 alert alert-danger errorMsg'>Debes introducir un nombre para acceder al chat.</div>").focus(); 
        } else {
            // En otro caso, creamos la sesión login y lanzamos el evento loginUser
            // pasando el nombre del usuario que se ha conectado
            manageSessions.set("login", $(".username").val());
            // El evento loginUser creará un nuevo socket asociado a nuestro usuario
            socket.emit("loginUser", manageSessions.get("login"));
            // Ocultamos la ventana modal
            $("#formModal").modal("hide");
            // Llamamos a la función que mantiene el scroll al fondo
            animateScroll();
            // Hacemos focus en el TextBox para escribir mensajes
            $(".message").focus();
        }
    });

    // Si se pulsa enter en la caja de texto username 
    $(".username").keydown(function(e) 
    {
        if (e.keyCode == 13) {
            $('#loginBtn').trigger('click');
        }
    });
 
    // Si el usuario ya está en uso, lanzamos el evento userInUse y mostramos el mensaje
    socket.on("userInUse", function()
    {
        // Mostramos la ventana modal
        $("#formModal").modal("show");
        // Eliminamos la sesión que se ha creado relacionada al usuario
        manageSessions.unset("login");
        // Ocultamos los mensajes de error de la modal
        $(".errorMsg").hide();
        // Añadimos un nuevo mensaje de error y ponemos el foco en el campo de texto de la modal
        $(".username").after("<div class='col-md-12 alert alert-danger errorMsg'>El usuario que intenta escoge está en uso.</div>").focus();
    });
 
    // Evento refreshChat (se ha enviado un mensaje)
    socket.on("refreshChat", function(action, message)
    {
        if (action == "conectado")
        {
            $("#chatMsgs").append("<p class='col-md-12 alert-info'>" + message + "</p>");
        }
        else if (action == "desconectado")
        {
            $("#chatMsgs").append("<p class='col-md-12 alert-danger'>" + message + "</p>");
        }
        else if (action == "msg")
        {
            $("#chatMsgs").append("<p class='col-md-12 alert-warning'>" + message + "</p>");
        }
        else if (action == "yo")  // El que se ha conectado es el usuario de esa maquina
        {
            $("#chatMsgs").append("<p class='col-md-12 alert-success'>" + message + "</p>");
        }

        // Llamamos a la función que mantiene el scroll al fondo
        animateScroll();
    });
 
    // Actualizamos el sidebar que contiene los usuarios conectados cuando
    // alguno se conecta o desconecta. El parámetro son los usuarios online actualmente
    socket.on("updateSidebarUsers", function(usersOnline)
    {
        // Limpiamos el sidebar donde almacenamos usuarios
        $("#chatUsers").html("");
        if ( !isEmptyObject(usersOnline) ) {
            // Recorremos el objeto y los mostramos en el sidebar.
            // Los datos están almacenados con {clave : valor}
            $.each(usersOnline, function(key, val)
            {
                $("#chatUsers").append("<p class='col-md-12 alert-info'>" + key + "</p>");
            })
        }
    });
 
    // Al pulsar el botón de enviar mensaje
    $('.sendMsg').on("click", function() 
    {
        enviarMensaje();
    });

    // Al pulsar intro en la caja de texto del mensaje
    $('.message').keydown(function(e)
    {
        if (e.keyCode == 13) {
            enviarMensaje();
        }
    });
});
 

// Funcion para enviar el mensaje al servidor
function enviarMensaje()
{
    // Capturamos el valor del campo de texto donde se escriben los mensajes
    var message = $(".message").val();
    if (message.length > 0) {
        // Emitimos el evento addNewMessage, el cuál simplemente mostrará
        // el mensaje escrito en el chat con nuestro nombre.
        // Permanece en la sesión del socket relacionado a mi conexión
        socket.emit("addNewMessage", message);
        // Limpiamos la caja de texto
        $(".message").val("");
    } else {
        showModal("Error formulario","<p class='alert alert-danger'>El mensaje debe tener al menos un carácter.</p>", "true");
    }

    // Llamamos a la función que mantiene el scroll al fondo
    animateScroll();
}


// Función para mostrar dialogos modales
function showModal(title, message, showClose)
{
    console.log(showClose)
    $("h2.title-modal").text(title).css({"text-align":"center"});
    $("p.formModal").html(message);
    if(showClose == "true") {
        $(".modal-footer").html('<a data-dismiss="modal" aria-hidden="true" class="btn btn-danger">Cerrar</a>');
        $("#formModal").modal({show:true});
    } else {
        $("#formModal").modal({show:true, backdrop: 'static', keyboard: true });
    }
}
 

// Formulario html de la ventana modal
function renderForm()
{
    var html = "";
    html += '<div class="form-group" id="formLogin">';
    html += '<input type="text" id="username" class="form-control username" placeholder="Introduce un nombre de usuario">';
    html += '</div>';
    html += '<button type="submit" class="btn btn-primary btn-large" id="loginBtn">Entrar</button>';
    return html;
}
 

// Objeto para el manejo de sesiones
var manageSessions = {
    //obtenemos una sesión //getter
    get: function(key) {
        return sessionStorage.getItem(key);
    },
    //creamos una sesión //setter
    set: function(key, val) {
        return sessionStorage.setItem(key, val);
    },
    //limpiamos una sesión
    unset: function(key) {
        return sessionStorage.removeItem(key);
    }
};
 

// Función que comprueba si un objeto está vacio, devuelve un boolean
function isEmptyObject(obj) 
{
    var name;
    for (name in obj) {
        return false;
    }
    return true;
}