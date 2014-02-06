
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/users', user.list);

var server = http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

var io = require('socket.io').listen(server);

// Objeto para guardar en la sesion del socket los usuarios conectados
var usuariosOnline = {};

// Conexion de un usuario-socket (definido por socket.io)
io.sockets.on('connection', function(socket) 
{    

	// Cuando el usuario se conecta al chat, comprobamos si esta logueado.
	//   username: sesion login almacenada con sessionStorage
	socket.on("loginUser", function(username)
	{
		// Si ya existe ese nombre de usuario en el chat
		if (usuariosOnline[username]) {
			socket.emit("userInUse");
		} else {
			// Guardamos el nombre de usuario en la sesion del socket para este cliente
			socket.username = username;

			// Añadimos al usuario a la lista global de usuarios conectados
			usuariosOnline[username] = socket.username;

			// Mensajes en el chat para mostrar la conexion del nuevo usuario
			// 	Lo que yo veo (emit)
			socket.emit("refreshChat", "yo", "Bienvenido " + 
				socket.username + ", te has conectado correctamente.");
			// 	Lo que ven los demas (broadcast.emit)
			socket.broadcast.emit("refreshChat", "conectado", "El usuario " + 
				socket.username + " se ha conectado al chat.");

			// Actualizamos la lista de usuarios en el lado del cliente
			io.sockets.emit("updateSidebarUsers", usuariosOnline);
		}
	});
 

	// Enviar nuevo mensaje
	//		message: mensaje escrito en el chat (contenido de la caja de texto)
	socket.on('addNewMessage', function(message) 
	{
		socket.emit("refreshChat", "msg", "Yo: " + message);
		socket.broadcast.emit("refreshChat", "msg", socket.username + " dice: " + message);
	});
 

	// Cerrar o actualizar el navegador
	socket.on("disconnect", function()
	{
		// Si el usuario sin estar logueado refresca la pagina, el typeof del 
		// socket username es undefined.
		// Para evitar mostrar el mensaje "El usuario undefined se ha 
		// desconectado del chat":
		if (typeof(socket.username) != "undefined") {
			// Eliminamos al usuario de la lista global
			delete usuariosOnline[socket.username];

			// Actualizamos la lista de usuarios en el chat (lado del cliente)
			io.sockets.emit("updateSidebarUsers", usuariosOnline);

			// Emitimos el mensaje global de desconexión
			socket.broadcast.emit("refreshChat", "desconectado", "El usuario " + 
				socket.username + " se ha desconectado del chat.");
		}
	});
});