const toastMsg = (msg='测试', duration=5000)=>{
    let existingNotifyEl = document.querySelector('.notificationToast-123456');
    if(existingNotifyEl){
        existingNotifyEl.classList.remove('active');
        existingNotifyEl.remove();
    }
    let notificationEl = document.createElement('div');
    notificationEl.classList.add('notificationToast-123456');
    notificationEl.innerHTML = msg;
    document.body.appendChild(notificationEl);
    notificationEl.classList.add('active');
    let t = setTimeout(()=>{
        notificationEl.classList.remove('active');
        clearTimeout(t)
        t = null
    }, duration)
}
const sendMsgBtn = document.getElementById('sendMsg');
const sendMsg = document.getElementById('send');
const chatBox = document.getElementById('chatBox');
const chatArea = document.querySelector('.chatArea');
const getChatMessage = ()=>{
    if(chatList.length > 0){
        chatList.forEach((message)=>{
            chatArea.innerHTML += `
            <div class="${message.type == 2?'user':'support'}">
                <p class="chatContent">${message.content}</p>
            </div>
            `
        })
    }
}
const addChatMessage = (message)=>{
    chatArea.innerHTML += `
    <div class="${message.type == 2?'user':'support'}">
        <p class="chatContent">${message.content}</p>
    </div>
    `
    document.getElementById('chatInput').value = ''
}
const chatList = [
    {
        create_time: '2023-01-01 00:00:00',
        content: '测试消息',
        type: 1,
        contentType: 'text',
        status: 'success',
    },
    {
        create_time: '2023-01-02 11:30:21',
        content: 'OKOK',
        type: 2,
        contentType: 'text',
        status: 'success',
    }
]
sendMsg.addEventListener('click', e=>{
    e.preventDefault();
    let message = {
        create_time: new Date().toLocaleString(),
        content: document.getElementById('chatInput').value,
        type: 2,
        contentType: 'text',
        status: 'success',
    }
    chatList.push(message)
    addChatMessage(message)
})
const chatWebSocket = {
    socket: null,
    url: 'ws://localhost:8181',
    status: false,
    token: null,
    loginStatus: false,
    sendMessageMap: new Map(),
    reconnectInterval: 500,
    reconnectTimeout: null,
    getStatus() {
        return this.status;
    },
    getloginStatus() {
        return this.loginStatus;
    },
    setAllStatus() {
        this.status = false;
        this.loginStatus = false;
    },
    connect(){
        this.socket = new WebSocket(this.url);
        this.socket.onopen = () => {
            this.status = true;
            this.loginStatus = false;
            this.reconnectTimeout = 500;
            this.sendMessageMap.forEach((value, key) => {
                this.socket.send(value);
                this.sendMessageMap.delete(key);
            });
        };
        this.socket.onclose = () => {
            this.status = false;
            this.loginStatus = false;
            if(this.reconnectTimeout == null){
                this.reconnectTimeout = setTimeout(() => {
                    this.connect();
                }, this.reconnectInterval);
            }
        }
        this.socket.onerror = () => {
            this.status = false;
            this.loginStatus = false;
            if(this.reconnectTimeout == null){
                this.reconnectTimeout = setTimeout(() => {
                    this.connect();
                }, this.reconnectInterval);
            }
        }
        this.socket.onmessage = (ev) => {
            try {
                let data = JSON.parse(ev.data)
                if(data.cmd == 'login' && data.statusCode == 200){
                    this.loginStatus = true;
                    this.socket.token = data.data.token;
                    sendMsgBtn.style.display = 'none';
                    chatBox.style.display = 'flex';
                    getChatMessage()
                    toastMsg('登录成功', 5000);
                }
            } catch (error) {
                console.log(error);
            }
        }
    },
    send(data) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
            if (data.cmd === "logout") {
                    if(localStorage.getItem('logout_normal')=='y'){
                        alert('登出成功');
                        let t1 = setTimeout(()=>{
                            localStorage.setItem('logout_normal', 'n')
                            clearTimeout(t1)
                            t1 = null
                        },1000)
                    }
                if(this.reconnectTimeout == null){
                    this.reconnectTimeout = setTimeout(() => {
                        this.connect();
                    }, this.reconnectInterval);
                }
            }
        } else {
            console.error('WebSocket connection is not open');
            if (!this.status) {
                if(this.reconnectTimeout == null){
                    this.reconnectTimeout = setTimeout(() => {
                        this.connect();
                    }, this.reconnectInterval);
                }
            }
        }
    },
    close() {
        if (this.socket) {
            this.socket.onclose = null; // 清除 onclose 事件处理程序
            this.socket.onerror = null; // 清除 onerror 事件处理程序
            this.socket.close();
            this.socket = null;
        }
    },
}

chatWebSocket.connect();

setInterval(()=>{
    if(chatWebSocket.getStatus()){
        if(chatWebSocket.getloginStatus()){
            chatWebSocket.send({
                cmd: 'ping',
                data:null,
                status:1
            })
        }
    }
},25000)
setInterval(()=>{
    if(chatWebSocket.getStatus()){
        if(!chatWebSocket.getloginStatus()){
            if(chatWebSocket.sendMessageMap.get('login')){
                chatWebSocket.send(chatWebSocket.sendMessageMap.get('login'))
                chatWebSocket.sendMessageMap.delete('login')
            }
        }
    }
},1000)

sendMsgBtn.addEventListener('click', (e) => {
    e.preventDefault()
    console.log(chatWebSocket.socket);
    if(chatWebSocket.socket == null){
        chatWebSocket.connect()
    }
    chatWebSocket.sendMessageMap.set('login', {
        cmd: 'login',
        data: {
            name: 'user1',
            password: '123456'
        },
        status:0
    })
    toastMsg('发送成功', 2000);
})