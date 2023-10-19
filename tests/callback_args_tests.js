const test = require('ava');
const { run_code } = require('../dist/test_util.js')

// ChatGPT-generated!
test('Callback Args: http server', async function(t) {
  function code() {
    const http = require('http');

    // Create an HTTP server
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Hello, World!\n');
    });

    // Start the server
    const port = 34324;
    server.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });

    // Send a request to the server
    const request = http.request(
      {
        hostname: 'localhost',
        port: port,
        path: '/',
        method: 'GET',
      },
      (response) => {
        let data = '';

        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('end', () => {
          console.log('Response from server:');
          console.log(data);

          // Close the server after receiving the response
          server.close(() => {
            console.log('Server is now closed.');
          });
        });
      }
    );

    request.end();
  }
  const spec = {mode: "BATCH",
                extra_agent_args: ["--event-threshold", "0"]}
  const result = await run_code(code, spec)
  t.deepEqual(result['http.ServerResponse.writeHead'], ["./test_code.js"])
})

test('Callback Args: http server request event', async function(t) {
  function code() {
    const http = require('http');

    // Create an HTTP server
    const server = http.createServer();
    server.on("request", (req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Hello, World!\n');
    })

    // Start the server
    const port = 34325;
    server.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });

    // Send a request to the server
    const request = http.request(
      {
        hostname: 'localhost',
        port: port,
        path: '/',
        method: 'GET',
      },
      (response) => {
        let data = '';

        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('end', () => {
          console.log('Response from server:');
          console.log(data);

          // Close the server after receiving the response
          server.close(() => {
            console.log('Server is now closed.');
          });
        });
      }
    );
    request.end();

  }

  const spec = {mode: "BATCH",
                extra_agent_args: ["--event-threshold", "0"]}
  const result = await run_code(code, spec)
  t.deepEqual(result['http.ServerResponse.writeHead'], ["./test_code.js"])
})

test('Callback Args: Distinguish by number: 0', async function(t) {
  async function code() {
    const { opendir } = require('fs/promises')
    const dir = await opendir("./")
    const dirEnt = await dir.read()
    console.log("isDir: %s", dirEnt.isDirectory())
  }

  const spec = {mode: "BATCH",
                extra_agent_args: ["--event-threshold", "0"]}
  const result = await run_code(code, spec)
  t.deepEqual(result['fs.Dirent.isDirectory'], ["./test_code.js"])
})

test('Callback Args: Distinguish by number: 1', async function(t) {
  async function code() {
    function callback(err, dirEnt) {
      console.log("isDir: %s", dirEnt.isDirectory())
    }
    const { opendir } = require('fs/promises')
    const dir = await opendir("./")
    await dir.read(callback)
  }

  const spec = {mode: "BATCH",
                extra_agent_args: ["--event-threshold", "0"]}
  const result = await run_code(code, spec)
  t.deepEqual(result['fs.Dirent.isDirectory'], ["./test_code.js"])
})

test('Callback Args: clientRequest on', async function(t) {
  function code() {
    const http = require('node:http');
    const net = require('node:net');
    const { URL } = require('node:url');

    // Create an HTTP tunneling proxy
    const proxy = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('okay');
    });
    proxy.on('connect', (req, clientSocket, head) => {
      // Connect to an origin server
      const { port, hostname } = new URL(`http://${req.url}`);
      const serverSocket = net.connect(port || 80, hostname, () => {
        clientSocket.write('HTTP/1.1 200 Connection Established\r\n' +
                        'Proxy-agent: Node.js-Proxy\r\n' +
                        '\r\n');
        serverSocket.write(head);
        serverSocket.pipe(clientSocket);
        clientSocket.pipe(serverSocket);
      });
    });

    // Now that proxy is running
    const port = 34333
    proxy.listen(port, '127.0.0.1', () => {

      // Make a request to a tunneling proxy
      const options = {
        port: port,
        host: '127.0.0.1',
        method: 'CONNECT',
        path: 'www.google.com:80',
      };

      const req = http.request(options);
      req.end();

      req.on('connect', (res, socket, head) => {
        console.log('got connected!');

        // Make a request over an HTTP tunnel
        socket.write('GET / HTTP/1.1\r\n' +
                    'Host: www.google.com:80\r\n' +
                    'Connection: close\r\n' +
                    '\r\n');
        socket.on('data', (chunk) => {
          console.log(chunk.toString());
        });
        socket.on('end', () => {
          proxy.close();
        });
      });
    });
  }

  const spec = {mode: "BATCH",
                extra_agent_args: ["--event-threshold", "0",
                                   "--trace-unknown-builtins"]}
  const result = await run_code(code, spec)
  t.truthy(result['stream.Duplex.write'])
  t.truthy(result['stream.Duplex.on'])
  t.deepEqual(result['http.OutgoingMessage.end'], ["./test_code.js"])
})

test.skip('Callback Args: trace events through classes that extend eventEmitter', async function(t) {
  function code() {
    const http = require('node:http');
    const net = require('node:net');
    const { URL } = require('node:url');

    // Create an HTTP tunneling proxy
    const proxy = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('okay');
    });
    proxy.on('connect', (req, clientSocket, head) => {
      // Connect to an origin server
      const { port, hostname } = new URL(`http://${req.url}`);
      const serverSocket = net.connect(port || 80, hostname, () => {
        clientSocket.write('HTTP/1.1 200 Connection Established\r\n' +
                        'Proxy-agent: Node.js-Proxy\r\n' +
                        '\r\n');
        serverSocket.write(head);
        serverSocket.pipe(clientSocket);
        clientSocket.pipe(serverSocket);
      });
    });

    // Now that proxy is running
    const port = 34333
    proxy.listen(port, '127.0.0.1', () => {

      // Make a request to a tunneling proxy
      const options = {
        port: port,
        host: '127.0.0.1',
        method: 'CONNECT',
        path: 'www.google.com:80',
      };

      const req = http.request(options);
      req.end();

      req.on('connect', (res, socket, head) => {
        console.log('got connected!');

        // Make a request over an HTTP tunnel
        socket.write('GET / HTTP/1.1\r\n' +
                    'Host: www.google.com:80\r\n' +
                    'Connection: close\r\n' +
                    '\r\n');
        socket.on('data', (chunk) => {
          console.log(chunk.toString());
        });
        socket.on('end', () => {
          proxy.close();
        });
      });
    });
  }

  const spec = {mode: "BATCH",
                extra_agent_args: ["--event-threshold", "0",
                                   "--trace-unknown-builtins"]}
  const result = await run_code(code, spec)
  console.log(result)
  // This should be traced. However, since req internally extends
  // eventEmitter, we don't do the event emitter proxy tracing here
  t.deepEqual(result['stream.Duplex.on'], ["./test_code.js"])
})

test('Callback Args: request upgrade', async function(t) {
  function code() {
    const http = require('node:http');

    // Create an HTTP server
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('okay');
    });
    server.on('upgrade', (req, socket, head) => {
      socket.write('HTTP/1.1 101 Web Socket Protocol Handshake\r\n' +
                  'Upgrade: WebSocket\r\n' +
                  'Connection: Upgrade\r\n' +
                  '\r\n');

      socket.pipe(socket); // echo back
    });

    // Now that server is running
    const port = 34334
    server.listen(port, '127.0.0.1', () => {

      // make a request
      const options = {
        port: port,
        host: '127.0.0.1',
        headers: {
          'Connection': 'Upgrade',
          'Upgrade': 'websocket',
        },
      };

      const req = http.request(options);
      req.end();

      req.on('upgrade', (res, socket, upgradeHead) => {
        console.log('got upgraded!');
        socket.end();
        process.exit(0);
      });
    });
  }

  const spec = {mode: "BATCH",
  extra_agent_args: ["--event-threshold", "0",
                     "--trace-unknown-builtins"]}
  const result = await run_code(code, spec)
  console.log(result)
  t.deepEqual(result['stream.Duplex.end'], ["./test_code.js"])
})