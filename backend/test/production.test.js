const test=require('node:test');const assert=require('node:assert/strict');
const validate=require('../config/production');
test('production refuses demo mode, missing secrets and unsafe origins',()=>{
 assert.throws(()=>validate({NODE_ENV:'production'}));
 const env={NODE_ENV:'production',MONGODB_URI:'mongodb://localhost/db',JWT_SECRET:'a'.repeat(40),FRONTEND_URL:'https://example.com',CORS_ORIGIN:'https://example.com'};
 assert.doesNotThrow(()=>validate(env));
 for(const patch of [{DEMO_MODE:'true'},{JWT_SECRET:'secret'},{CORS_ORIGIN:'*'},{FRONTEND_URL:'http://example.com'}])assert.throws(()=>validate({...env,...patch}));
});
test('Gemini REST uses configured model and header; rejects missing credentials and provider failures',async()=>{
 const saved={key:process.env.GEMINI_API_KEY,model:process.env.GEMINI_MODEL,fetch:global.fetch};
 const {generateContent}=require('../config/gemini');
 try {
  delete process.env.GEMINI_API_KEY;await assert.rejects(generateContent('Test'),e=>e.status===503);
  process.env.GEMINI_API_KEY='synthetic-key';process.env.GEMINI_MODEL='gemini-test';
  global.fetch=async(url,options)=>{assert.ok(url.endsWith('/gemini-test:generateContent'));assert.equal(options.headers['x-goog-api-key'],'synthetic-key');assert.ok(!url.includes('synthetic-key'));return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:'{"ok":true}'}]}}]})}};
  assert.equal(await generateContent('Test'),'{"ok":true}');
  global.fetch=async()=>({ok:false});await assert.rejects(generateContent('Test'),e=>e.status===502);
 }finally{global.fetch=saved.fetch;for(const [key,value]of [['GEMINI_API_KEY',saved.key],['GEMINI_MODEL',saved.model]]){if(value===undefined)delete process.env[key];else process.env[key]=value}}
});
test('Maps endpoint never returns the private server key',async t=>{
 const {load,serve,guard}=require('./helpers.cjs');const express=require('express');const path=require('path');
 const old=process.env.GOOGLE_MAPS_API_KEY,oldBrowser=process.env.GOOGLE_MAPS_BROWSER_KEY;
 process.env.GOOGLE_MAPS_API_KEY='private-server';process.env.GOOGLE_MAPS_BROWSER_KEY='restricted-browser';
 try {
 const router=load(path.join(__dirname,'../routes/maps.js'),{'../middleware/auth':{protect:guard,governmentOnly:guard,farmerOnly:guard}});
 const request=await serve(t,express,router);const r=await request('GET','/api-key',undefined,{Authorization:'test'});assert.equal(r.body.apiKey,'restricted-browser');
 }finally{for(const[k,v]of [['GOOGLE_MAPS_API_KEY',old],['GOOGLE_MAPS_BROWSER_KEY',oldBrowser]]){if(v===undefined)delete process.env[k];else process.env[k]=v}}
});
