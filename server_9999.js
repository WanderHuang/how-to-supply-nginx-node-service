const ws = require('ws');
const http = require('http');
const fs = require('fs');

const server = http.createServer({
  // key: fs.readFileSync('./privatekey.pem'),
  // cert: fs.readFileSync('./certificate.pem'),
});

const wss = new ws.Server({ server });

wss.on('connection', (ws) => {
  console.log('socket is on 9999');
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

server.listen(9999);
