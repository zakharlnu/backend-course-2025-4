const { program } = require("commander")
const http = require('http');
const fs = require("node:fs")
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

function readJsonFile(filePath, callback) {
    fs.readFile(filePath, { encoding: 'utf-8' }, (error, data) => {
        if (error) {
            return callback(new Error("Cannot find input file"));
        }
        try {
            const parsedData = JSON.parse(data);
            return callback(null, parsedData);
        } 
        catch (error) {
            return callback(error);
        }
    });
}


readJsonFile(input, (error, data) => {
    if (error) {
        console.error(`error: ${error.message}`);
        return;
    }
    const server = http.createServer((req, res) => {
        try {
            const parsedUrl = url.parse(req.url, true);
            if (parsedUrl.pathname === "/" && req.method === "GET") {
                let filtredData = data;
                if (parsedUrl.query.furnished === 'true') {
                    filtredData = filtredData.filter((value) => value.furnishingstatus === 'furnished') 
                }

                const maxPrice = parseInt(parsedUrl.query.max_price)
                if (maxPrice) {
                    filtredData = filtredData.filter((value) => value.price < maxPrice);
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
        } catch(error) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ message: `internal server error: ${error.message}}`}));
        } 
    });

    server.listen(port, host, () => {
        console.log(`server running at http://${host}:${port}/`);
    });
})