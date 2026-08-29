import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url))); const port=4175;
const types={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".jpg":"image/jpeg"};
async function proxy(pathname, search){const endpoint=pathname==="/api/cards"?"/cards/get_details":`/market/history${search}`;const response=await fetch(`https://api.splinterlands.com${endpoint}`,{headers:{"user-agent":"card-ledger-local-proxy/1.0"}});if(!response.ok)throw new Error(`Splinterlands API ${response.status}`);return response.text();}
http.createServer(async(req,res)=>{try{const url=new URL(req.url||"/",`http://${req.headers.host||"localhost"}`);if(url.pathname==="/api/cards"||url.pathname==="/api/market-history"){const body=await proxy(url.pathname,url.search);res.writeHead(200,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"});return res.end(body)}const requested=url.pathname==="/"?"/index.html":url.pathname;const file=path.resolve(root,`.${decodeURIComponent(requested)}`);if(!file.startsWith(root)){res.writeHead(403);return res.end("Forbidden")}const body=await fs.readFile(file);res.writeHead(200,{"Content-Type":types[path.extname(file)]||"application/octet-stream","Cache-Control":"no-store"});res.end(body)}catch(e){res.writeHead(e.code==="ENOENT"?404:502);res.end(e.code==="ENOENT"?"Not found":`Proxy error: ${e.message}`)}}).listen(port,()=>console.log(`Market Watch Studio running at http://localhost:${port}`));

