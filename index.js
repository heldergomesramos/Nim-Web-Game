const http = require('http');
const url = require('url');
const methods = require('./methods.js');

const port = 8001;

const server = http.createServer(function (request, response) {
	const parsedUrl = url.parse(request.url,true);    
    let pathname = parsedUrl.pathname;
    const query = parsedUrl.query;
    let body = '';

    switch(request.method) {
        case 'POST':
            request
                .on('data', (chunk) => { body += chunk; })
                .on('end', () => {
                    try {
                        let json = JSON.parse(body);
                        methods.postRequest(json, pathname, response);
                    }
                    catch(err) {}
                })
                .on('error', (err) => { console.log(err.message); });
            break;
        case 'GET':
            if (pathname == "/")
                pathname = "/index.html";
            methods.getRequest(request, pathname, response, query);
		break;
        default:
            response.writeHead(501);
            response.end();
            break;
    }
});

server.listen(port);