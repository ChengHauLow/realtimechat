const WebSocket = require('ws');

// Create a WebSocket server on port 8181
const server = new WebSocket.Server({ port: 8181 });
// Array to keep track of all connected clients
const fs = require('fs')



let authUser = [
    {id: 1, name: 'user1', password: '123456', chatList:[{
        create_time: new Date().toLocaleString(),
        content: 'Welcome, how can I help you?',
        type: 1,
        contentType: 'text',
        status: 'success',
    }]},
    {id: 2, name: 'user2', password: '123456', chatList:[{
        create_time: new Date().toLocaleString(),
        content: 'Welcome, how can I help you?',
        type: 1,
        contentType: 'text',
        status: 'success',
    }]}
]

const localStorage = {
    setItem: (k, value) => {
        let data = fs.readFileSync('store.txt', 'utf-8')
        let params = data?JSON.parse(data):{}
        params[k] = value
        fs.writeFile('store.txt', JSON.stringify(params), (err) => {
            if (err) throw err;
        })
    },
    getItem: (k) => {
        let data = fs.readFileSync('store.txt', 'utf-8')
        if(data){
            return JSON.parse(data)[k]
        }else{
            return false
        }
    }
}

const setStoreNow = (id) =>{
    let user = authUser.find(u=>u.id === id)
    if(user){
        localStorage.setItem(user.name, JSON.stringify(user.chatList))
    }else{
        let admin = adminUser.find(u=>u.id === id)
        localStorage.setItem(admin.name, JSON.stringify(admin.chatList))
    }
}

const getStoreNow = (id) =>{
    let user = authUser.find(u=>u.id === id)
    if(user){
        return localStorage.getItem(user.name)?JSON.parse(localStorage.getItem(user.name)):[]
    }else{
        let admin = adminUser.find(u=>u.id === id)
        return localStorage.getItem(admin.name)?JSON.parse(localStorage.getItem(admin.name)):[]
    }
}

for (let i = 0; i < authUser.length; i++) {
    if(getStoreNow(authUser[i].id).length >= 1){
        authUser[i].chatList = getStoreNow(authUser[i].id)
    }
}

let adminUser = [
    {id: 100, name: 'admin1', password: '123456', chatList:[]},
]
let clients = [];
const generateToken = (userId) => {
    return `${userId}-${Math.random().toString(36).substring(2, 15)}`
}

const decryptToken = (token) => {
    return Number(`${token}`.split('-')[0])
}

let getStatusCode = new Map([
    ['Success', 200],
    ['Login Success', 200],
    ['Logout Success', 200],
    ['Login Fail', 400],
    ['Invalid Token', 401],
    ['User Not Found', 404],
    ['Please login 1st', 1000],
    ['Unauthorised Request', 1001],
    ['Already Login', 1002],
]
)

const sendMsg = (msg, token, socket) => {
    if(!token){
        socket.send(JSON.stringify({
            cmd: msg.cmd,
            data: {},
            statusCode: getStatusCode.get('Please login 1st'),
            statusMsg: 'Please login 1st'
        }))
        return
    }
    clients.forEach(client => {
        if (client.token == token) {
            socket.send(JSON.stringify(msg));
        }
    });
}

server.on('connection', (socket) => {
    
    // When a message is received, broadcast it to all clients
    socket.on('message', (message) => {
        let data = JSON.parse(message);
        if(socket.token){
            if(data.cmd == 'logout'){
                clients = clients.filter(client => client.token != socket.token)
                socket.token = null
                socket.send(JSON.stringify({
                    cmd: data.cmd,
                    data: {},
                    statusCode: getStatusCode.get('Logout Success'),
                    statusMsg: 'Logout Success'
                }))
                socket.close()
                return
            }
        }
        if(data.cmd == 'login'){
            let loginInfo = data.data
            let user = authUser.find(user => user.name == loginInfo.name && user.password == loginInfo.password)
            let admin = adminUser.find(admin => admin.name == loginInfo.name && admin.password == loginInfo.password)
            if(user){
                let loginUser = clients.find(client => client.userId == user.id)
                if(loginUser){
                    socket.send(JSON.stringify({
                        cmd: data.cmd,
                        data: {
                            msgList: user.chatList
                        },
                        statusCode: getStatusCode.get('Already Login'),
                        statusMsg: 'Already Login'
                    }))
                    return
                }
                socket.userId = user.id
                let token = generateToken(user.id)
                socket.token = token
                clients.push({userId: user.id, token: token});
                sendMsg({
                    cmd: data.cmd,
                    data:{
                        token: socket.token,
                        msgList: user.chatList
                    },
                    statusCode: getStatusCode.get('Login Success'),
                    statusMsg: 'Login Success'
                }, token, socket)
                return
            }else if(admin){
                let loginUser = clients.find(client => client.userId == admin.id)
                if(loginUser){
                    socket.send(JSON.stringify({
                        cmd: data.cmd,
                        data: {
                            msgList: admin.chatList
                        },
                        statusCode: getStatusCode.get('Already Login'),
                        statusMsg: 'Already Login'
                    }))
                    return
                }
                socket.userId = admin.id
                let token = generateToken(admin.id)
                socket.token = token
                clients.push({userId: admin.id, token: token});
                sendMsg({
                    cmd: data.cmd,
                    data:{
                        token: socket.token,
                        msgList: admin.chatList
                    },
                    statusCode: getStatusCode.get('Login Success'),
                    statusMsg: 'Login Success'
                }, token, socket)
                return
            }else{
                socket.send(JSON.stringify({
                    cmd: data.cmd,
                    data: null,
                    statusCode: getStatusCode.get('User Not Found'),
                    statusMsg: 'User Not Found'
                }));
                socket.close()
                return
            }
        }else if(data.cmd == 'message'){
            if(data.data != null){
                let userIdNow = decryptToken(socket.token)
                let user = authUser.find(user => user.id == userIdNow)
                if(user){
                    authUser.map(user => {
                        if(user.id == userIdNow){
                            user.chatList.push(data.data)
                            setStoreNow(user.id)
                        }
                    })
                    sendMsg({
                        cmd: data.cmd,
                        data: user.chatList,
                        statusCode: getStatusCode.get('Success'),
                        statusMsg: 'Received'
                    }, socket.token, socket)
                }else{
                    sendMsg({
                        cmd: data.cmd,
                        data: [],
                        statusCode: getStatusCode.get('User Not Found'),
                        statusMsg: 'User Not Found'
                    }, socket.token, socket)
                }
            };
        }else{
            let authClient = clients.find(client => client.token == socket.token)
            if(authClient){
                sendMsg({
                    cmd: data.cmd,
                    data: data.data,
                    statusCode: getStatusCode.get('Success'),
                    statusMsg: 'Received'
                }, socket.token, socket)
            }else{
                socket.send(JSON.stringify({
                    cmd: data.cmd,
                    data: null,
                    statusCode: getStatusCode.get('Please login 1st'),
                    statusMsg: 'Please login 1st'
                }))
            }
        }
    });

    // Remove the client from the list when it disconnects
    socket.on('close', () => {
        clients = clients.filter(client => client !== socket);
    });
});

console.log('WebSocket server is running on ws://localhost:8181');
