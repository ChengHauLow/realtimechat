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

let getStatusCode = new Map([
    ['Success', 200],
    ['Login Success', 200],
    ['Logout Success', 200],
    ['Login Fail', 400],
    ['Already Login', 1000],
    ['User Not Found', 404],
    ['Unauthorised Request', 1001],
    ['Invalid Token', 401]
]
)

server.on('connection', (socket) => {
    
    // When a message is received, broadcast it to all clients
    socket.on('message', (message) => {
        let data = JSON.parse(message);
        if(socket.token){
            if(data.cmd == 'logout'){
                clients = clients.filter(client => client.token != socket.token)
                socket.send(JSON.stringify({
                    cmd: data.cmd,
                    data: {},
                    status: getStatusCode.get('Logout Success'),
                    statusMsg: 'Logout Success'
                }))
                socket.close()
                return
            }
        }
        if(data.cmd == 'login'){
            let loginInfo = data.data
            let user = authUser.find(user => user.name == loginInfo.name && user.password == loginInfo.password)
            if(user){
                let loginUser = clients.find(client => client.userId == user.id)
                if(loginUser){
                    socket.send(JSON.stringify({
                        cmd: data.cmd,
                        data: null,
                        status: getStatusCode.get('Already Login'),
                        statusMsg: 'Already Login'
                    }))
                }
                socket.userId = user.id
                socket.token = generateToken(user.id)
                clients.push(socket);
                socket.send(JSON.stringify({
                    cmd: data.cmd,
                    data:{
                        token: socket.token
                    },
                    status: getStatusCode.get('Login Success'),
                    statusMsg: 'Login Success'
                }));
                return
            }else{
                socket.send(JSON.stringify({
                    cmd: data.cmd,
                    data: null,
                    status: getStatusCode.get('User Not Found'),
                    statusMsg: 'User Not Found'
                }));
                socket.close()
                return
            }
        }else{
            let authClient = clients.find(client => client.token == data.token)
            if(authClient){
                clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        if(client.token == data.token){
                            client.send(JSON.stringify({
                                cmd: data.cmd,
                                data: data.data,
                                status: getStatusCode.get('Success'),
                                statusMsg: 'Received'
                            }));
                        }
                    }
                });
            }else{
                socket.send(JSON.stringify({
                    cmd: data.cmd,
                    data: null,
                    status: getStatusCode.get('Unauthorised Request'),
                    statusMsg: 'Unauthorised Request'
                }))
            }
        }
    });

    // Remove the client from the list when it disconnects
    socket.on('close', () => {
        clients = clients.filter(client => client !== socket);
    });
});

console.log('WebSocket server is running on ws://localhost:8080');
