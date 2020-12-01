# 网络服务测试

如果是直接启用node服务的话，我们应该是这样的部署形态。

```
-----------client-------------
-w-------/---------\-----w----
-e-----https------wss----e----
-b-------\http2.0-/------b----
---------node-server----------
```

也就是说我们的node服务需要单独部署，一个node服务提供一个域名的服务，自行开启http2.0、https、wss等

但是中间加一层nginx做反向代理的话，外部访问的压力到nginx那里，nginx到我们的node为内网访问，速度更快。

```
--w----------client---------------w-----
--e----https-|----|--wss----------e-----
--b----------nginx----------------b-----
----------//--inner-\\------------------
--------server1---server2---------------
```

这种模式可以提供这些优势

1. 负载均衡
2. 集群优势

## nodejs启动http服务

简单返回一个html文件
```javascript
const http = require('http');

const server = http.createServer({}, (req, res) => {
  res.writeHead(200, {'content-type': 'text/html'});
  res.write('<div>9900</div>');
  res.end();
});


server.listen(9900);

```

## nodejs启动ws服务

简单启动一个ws服务

```javascript

const ws = require('ws');
const http = require('http');
const fs = require('fs');

const server = http.createServer({
  // key: fs.readFileSync('./privatekey.pem'),
  // cert: fs.readFileSync('./certificate.pem'),
});

const wss = new ws.Server({ server });

wss.on('connection', (ws) => {
  console.log('socket is on 9998');
  ws.send(
    JSON.stringify({
      type: 'MSG',
      data: [0, 1],
    })
  );

  setTimeout(() => {
    ws.send(
      JSON.stringify({
        type: 'EVT',
        data: {
          name: 'wander',
          age: 10,
        },
      })
    );
  });

  ws.on('message', (msg) => {
    console.log('socket get > ', msg);

    const mail = Math.random();

    console.log('socket send > ', mail);

    ws.send(mail);
  });
  ws.on('close', () => console.log('socket 9999 closed'));
});

server.listen(9998);


```

把上面的`http`改为`https`，并加上证书参数，就可以创建一个wss服务

```javascript


const ws = require('ws');
const http = require('https');
const fs = require('fs');

const server = http.createServer({
  key: fs.readFileSync('./privatekey.pem'),
  cert: fs.readFileSync('./certificate.pem'),
});

const wss = new ws.Server({ server });

wss.on('connection', (ws) => {
  console.log('socket is on 9998');
  ws.send(
    JSON.stringify({
      type: 'MSG',
      data: [0, 1],
    })
  );

  setTimeout(() => {
    ws.send(
      JSON.stringify({
        type: 'EVT',
        data: {
          name: 'wander',
          age: 10,
        },
      })
    );
  });

  ws.on('message', (msg) => {
    console.log('socket get > ', msg);

    const mail = Math.random();

    console.log('socket send > ', mail);

    ws.send(mail);
  });
  ws.on('close', () => console.log('socket 9999 closed'));
});

server.listen(9998);


```


## nginx配置

nginx很强大，这里我们学习了反向代理和负载均衡功能

```nginx
# ws 需要使用upgrade字段
# 这里配置$http_upgrade映射为$connection_upgrade字段，后面会用到
map $http_upgrade $connection_upgrade {
  default upgrade;
  '' close;
}

# websocket负载均衡
upstream websocket {
  server localhost:9999;
  server localhost:9998;
}

# http请求负载均衡
upstream ajax {
  server localhost:9900;
  server localhost:9901;
  server localhost:9902;
}

server {
  # listen 80为http
  # listen 443，开启ssl(https)，开启http2.0
  listen 443 ssl http2;
  server_name lb.com;
  # 改成你自己的证书
  ssl_certificate /xxx;
  # 改成你自己的证书密钥
  ssl_certificate_key /yyy;
  ssl_session_timeout 20m;
  ssl_verify_client off;

  location /ws {
    proxy_set_header X-Reeal-IP $remote_addr;
    proxy_set_header Host $host;
    proxy_set_header X-Forward-For $proxy_add_x_forwarded_for;
    # ws需要用到http 1.1
    # ws需要用到upgrade
    # ws中connection字段不会自动获取到，因此手动设置为Upgrade
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;

    # 代理此服务器地址
    proxy_pass http://websocket;
    proxy_read_timeout 300s;
    proxy_send_timeout 300s;
  }

  location / {
    # 负载均衡
    proxy_pass  http://ajax;
    proxy_set_header X-Real-IP  $remote_addr;
  }
}



```

## 生成证书

**生产环境需要从证书服务商处购买**

以下方法仅供本地测试用

**本地测试**

1. 安装openssl
2. 生成key `openssl genrsa -out private.key 2048`
3. 生成csr `openssl req -new -key private.key -out private.csr`
4. 生成证书 `openssl x509 -req -days 365 -in private.csr -signkey private.key -out private.crt`

我们生成了三个文件

- key `private.key`
- cert `private.crt`
- csr `private.csr`

其中`key`和`cert`对应`node`和`nginx`里面的`key`和`cert`


## 启动测试

`wscat`这个包可以在本地测试ws连接是否正常。你也可以起一个web服务来连接。

1. 启动`server_xxxx.js`
2. 启动`nginx`，确保`nginx`没有错误
3. 使用`wscat`测试或者在客户端测试

**TIP**

1. 负载均衡有多种算法可用
2. 反向代理的内网应用没必要使用`ssl`，内网使用`http`协议即可
3. 不要上传你的证书，避免被人利用，用好`.gitignore`



## LICENSE
MIT