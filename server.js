const WebSocket = require('ws');

// Create a WebSocket server on port 8080
const server = new WebSocket.Server({ port: 8080 });

// Array to keep track of all connected clients
let authUser = [
    {id: 1, name: 'user1', password: '123456'},
    {id: 2, name: 'user2', password: '123456'}
]
let clients = [];
const generateToken = (userId) => {
    return `${userId}-${Math.random().toString(36).substring(2, 15)}`
}

server.on('connection', (socket) => {
    
    // When a message is received, broadcast it to all clients
    socket.on('message', (message) => {
        let data = JSON.parse(message);
        if(data.cmd == 'login'){
            let loginInfo = data.data
            let user = authUser.find(user => user.name == loginInfo.name && user.password == loginInfo.password)
            if(user){
                socket.userId = user.id
                clients.push(socket);
            };
        }
        clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    cmd: data.cmd,
                    data:{
                        token: generateToken(client.userId)
                    },
                    status: 200
                }));
            }
        });
    });

    // Remove the client from the list when it disconnects
    socket.on('close', () => {
        clients = clients.filter(client => client !== socket);
    });
});

console.log('WebSocket server is running on ws://localhost:8080');
