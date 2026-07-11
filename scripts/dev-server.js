"use strict";

const http=require("http");
const fs=require("fs");
const path=require("path");
const root=path.resolve(__dirname,"..");
const port=Number(process.env.PORT||4173);
const types={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json; charset=utf-8",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".svg":"image/svg+xml",".webp":"image/webp",".ico":"image/x-icon",".woff":"font/woff",".woff2":"font/woff2",".txt":"text/plain; charset=utf-8",".xls":"application/vnd.ms-excel"};
const appRoutes=/^\/(?:permits(?:\/[^/]+(?:\/preview)?)?)?\/?$/;

function insideRoot(file){const relative=path.relative(root,file);return relative!==""&&!relative.startsWith("..")&&!path.isAbsolute(relative)}
function send(res,status,body,type="text/plain; charset=utf-8"){res.writeHead(status,{"Content-Type":type,"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});res.end(body)}
function serve(req,res){
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,"http://localhost").pathname)}catch{return send(res,400,"Solicitud inválida")}
  if(req.method!=="GET"&&req.method!=="HEAD")return send(res,405,"Método no permitido");
  const requested=path.resolve(root,"."+pathname);
  if(pathname!=="/"&&!insideRoot(requested))return send(res,403,"Acceso fuera del proyecto denegado");
  let file=pathname==="/"?path.join(root,"index.html"):requested;
  if(!fs.existsSync(file)&&appRoutes.test(pathname))file=path.join(root,"index.html");
  if(!fs.existsSync(file)||!fs.statSync(file).isFile())return send(res,404,"Recurso no encontrado");
  const type=types[path.extname(file).toLowerCase()]||"application/octet-stream";
  res.writeHead(200,{"Content-Type":type,"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});
  if(req.method==="HEAD")return res.end();
  fs.createReadStream(file).on("error",()=>send(res,500,"No fue posible leer el recurso")).pipe(res);
}

const server=http.createServer(serve);
server.on("clientError",(_,socket)=>socket.end("HTTP/1.1 400 Bad Request\r\n\r\n"));
server.listen(port,"127.0.0.1",()=>console.log(`GRAVI SST disponible en http://localhost:${port}`));
function close(){server.close(()=>process.exit(0))}
process.on("SIGINT",close);process.on("SIGTERM",close);
