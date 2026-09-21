#!/usr/bin/env node
import { request } from "node:http";
const port=Number(process.env.BOARD_PORT||3103);
const get=path=>new Promise((yes,no)=>{const r=request({hostname:"127.0.0.1",port,path},x=>{let s="";x.on("data",d=>s+=d);x.on("end",()=>x.statusCode===200?yes(s):no(new Error(String(x.statusCode))));});r.on("error",no);r.end()});
try { const html=await get("/"); if(!html.includes("board")) throw new Error("HTML do board ausente"); console.log("board-smoke: 0"); } catch (error) { console.error(error.message); process.exitCode=1; }
