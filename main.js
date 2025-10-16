const { program } = require("commander")
const http = require('http');
const fs = require("node:fs").promises
const url = require('node:url')

program
  .option("-i, --input <file>", "path to the input JSON file")
  .option('-h, --host <host>', 'host address')
  .option('-p, --port <port>', 'server port', (value) => {
    const parsed = Number(value);
    if (isNaN(parsed)) {
        console.error("port must be number between 1 and 65535");
        process.exit(1);
    }
    return parsed;
  })
  .parse();

const opts = program.opts();

if (!opts.input || !opts.host || !opts.port) {
    console.error('error: missing parameters');
    process.exit(1);
}

const { host, port, input } = opts;

async function readJsonFile(filePath) {
    try {
        const data = await fs.readFile(filePath, { encoding: "utf-8" })
        return JSON.parse(data);
    } catch(error) {
        console.error("Cannot find input file");
        process.exit(1);
    }
}

async function startServer() {
    const data = await readJsonFile(input);
    const server = http.createServer((req, res) => {
        const parsedUrl = url.parse(req.url, true);
        res.setHeader("Content-Type", "application/json");
        if (parsedUrl.pathname === "/" && req.method === 'GET') {
            res.statusCode = 200;
            res.end(JSON.stringify({ data }));
        } 
        else {
            res.statusCode = 404;
            res.end(JSON.stringify({ message: "not found"}));
        }
    });

    server.listen(port, host, () => {
        console.log(`server running at http://${host}:${port}/`);
    });
}

startServer();