const { program } = require("commander")
const http = require('http');
const fs = require("node:fs").promises
const { XMLBuilder } = require("fast-xml-parser");
const url = require('node:url')

program
  .option("-i, --input <file>", "path to the input JSON file")
  .option('-h, --host <host>', 'host address')
  .option('-p, --port <port>', 'server port', (value) => {
    const parsed = Number(value);
    if (!parsed || parsed < 1 || parsed > 65535) {
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
    try {
        const data = await readJsonFile(input);
        const server = http.createServer((req, res) => {
            const parsedUrl = url.parse(req.url, true);
            if (parsedUrl.pathname === "/" && req.method === "GET") {
                let filtredData = data;
                if (parsedUrl.query.furnished === 'true') {
                    filtredData = data.filter((value) => value.furnishingstatus === 'furnished') 
                }

                const max_price = parsedUrl.query.max_price
                if (max_price && parseInt(max_price)) {
                    filtredData = filtredData.filter((value) => value.price < max_price);
                }

                const builder = new XMLBuilder();
                const xml = builder.build({
                    houses: {
                        house: filtredData.map(({ price, area, furnishingstatus }) => ({
                          price,
                          area,
                          furnishingstatus,
                        })),
                      },
                });

                res.writeHead(200, { "Content-Type": "application/xml" });
                res.end(xml);
            } 
            else {
                res.writeHead(404, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "not found"}));
            }
        });

        server.listen(port, host, () => {
            console.log(`server running at http://${host}:${port}/`);
        });
    }
    catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "internal server error" }));
    }
}

startServer();