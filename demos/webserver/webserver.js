require("../../dist/index.js").init({dashboardPort: 4567})
const http = require('http');
const fs = require('fs');
const path = require('path')

// default to 8124 or use argument
let serverPort = 8124;
if (process.argv.length == 3) {
	serverPort = parseInt(process.argv[3]);
}

fs.truncateSync(path.join(__dirname, "requests.txt"))

// Create an exploitable http server
http.createServer(function (request, response) {
	if (request.method === "GET") {
		if (request.url === "/favicon.ico") {
			// Send the favicon
			response.setHeader('Content-Type', 'image/x-icon');
			fs.createReadStream(path.join(__dirname, 'public/favicon-32x32.png')).pipe(response);
			return;
		}
		if (request.url === "/index.html" || request.url === "/") {
			// Send the form page
			response.setHeader('Content-Type', 'text/html');
			fs.createReadStream(path.join(__dirname, 'public/index.html')).pipe(response);
			return;
		}

	} else if (request.method === "POST") {
		// process the post
		if (request.url === "/inbound") {
			let body = '';

			// read rest of body
			request.on('data', data => {
				body += data;

			});
			request.on('end', () => {
				// decode form data
				const qStr = decodeURIComponent(body).replaceAll("+", " ");

				// get json string
				const json_str = qStr.split('=')[1]
				try {
					// insecurely eval json to get object
					const json_json = eval(`(${json_str})`);
					// write the request
					fs.appendFile(path.join(__dirname, "requests.txt"), JSON.stringify(json_json), () => { });
					// echo the new json object
					response.end(`<html><body><title>Require Security</title>${json_str}</body></html>`);
				} catch (err) {
					// report error on invalid json
					response.end(`<html><body><title>Require Security</title>Invalid JSON</body></html>`);
				}
			})
		}

	}
}).listen(serverPort);
console.log('Server running at localhost:' + serverPort);
console.log('Instrumentation streamed to localhost:4567')
