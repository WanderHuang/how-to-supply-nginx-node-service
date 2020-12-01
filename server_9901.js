const http = require('http');

const server = http.createServer({}, (req, res) => {
  res.writeHead(200, {'content-type': 'text/html'});
  res.write('<div>9901</div>');
  res.end();
});


server.listen(9901);
