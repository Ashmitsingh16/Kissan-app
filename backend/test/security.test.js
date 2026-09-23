const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const express = require('express');
const jwt = require('jsonwebtoken');
const { load, serve, guard } = require('./helpers.cjs');
const source = file => path.join(__dirname, '..', file);
process.env.JWT_SECRET = 'test-secret-not-for-deployment-123456';
const header = { Authorization: 'Bearer fixture' };

test('public registration rejects government privileges', async t => {
  let created = false;
  const router = load(source('routes/auth.js'), {
    '../models/User': { findOne: async () => null, create: async () => { created = true; } },
    '../config/notifications': { sendEmail: async () => { throw new Error('Unexpected mail'); } }
  });
  const request = await serve(t, express, router);
  const r = await request('POST', '/register', { userType: 'government', name: 'Test', phone: '9876543210', idType: 'aadhar', idNumber: '123456789012', email: 'test@example.com', password: 'testing123' });
  assert.equal(r.status, 400); assert.equal(created, false);
});

test('farm creation and update preserve owner and reject database operators', async t => {
  let created, updated;
  const Farm = { create: async value => (created = value), findOne: async () => ({}),
    findOneAndUpdate: async (query, changes) => { updated = { query, changes }; return changes.$set; } };
  const router = load(source('routes/farm.js'), { '../models/Farm': Farm, '../middleware/auth': { protect: guard, farmerOnly: (q,s,n) => n() } });
  const request = await serve(t, express, router);
  const body = { farmName: 'Test', farmer: '333333333333333333333333', location: { state: 'Punjab', district: 'Test' }, totalArea: 2, areaUnit: 'acres', $unset: { farmer: '' }, isActive: false, soilType: '', crops: [{ cropName: 'Wheat', cropType: 'rabi', sowingDate: '2026-09-01', areaUnderCrop: 1 }] };
  assert.equal((await request('POST','/',body,header)).status,201);
  assert.equal(created.farmer, '111111111111111111111111'); assert.equal(created.$unset, undefined);
  assert.equal(created.crops[0].cropName, 'Wheat');
  await new (require('../models/Farm'))(created).validate();
  assert.equal((await request('PUT','/444444444444444444444444',body,header)).status,200);
  assert.equal(updated.query.farmer, '111111111111111111111111');
  assert.equal(updated.changes.$set.farmer, undefined); assert.equal(updated.changes.$unset, undefined);
  assert.equal(updated.changes.$set.isActive, undefined);
});

test('government approval, removed accounts and revoked tokens are enforced', async t => {
  let user = { _id: '111111111111111111111111', userType: 'government', isVerified: false, tokenVersion: 0 };
  const auth = load(source('middleware/auth.js'), { '../models/User': { findById: () => ({ select: async () => user }) } });
  const router = express.Router(); router.get('/', auth.protect, auth.governmentOnly, (q,s) => s.json({ ok:true }));
  const request = await serve(t,express,router);
  const headers = { Authorization: `Bearer ${jwt.sign({ id:'111111111111111111111111', tokenVersion:0 }, process.env.JWT_SECRET)}` };
  assert.equal((await request('GET','/',undefined,headers)).status,403);
  user.isVerified = true; assert.equal((await request('GET','/',undefined,headers)).status,200);
  user.tokenVersion = 1; assert.equal((await request('GET','/',undefined,headers)).status,401);
  user = null; assert.equal((await request('GET','/',undefined,headers)).status,401);
});

test('harvest advice denies another farmer before calling weather services', async t => {
  const router = load(source('routes/weather.js'), {
    '../middleware/auth': { protect:guard },
    '../models/Farm': { findById: async () => ({ farmer:'333333333333333333333333' }) },
    '../config/weather': {}
  });
  const request = await serve(t,express,router);
  assert.equal((await request('GET','/harvest-advisory/farm/crop',undefined,header)).status,403);
});

test('fallback routes keep optimized stops and duplicate-coordinate appointments', async t => {
  const appointments = [10, 1, 1].map((lat,i) => ({ _id:String(i), farm:{ farmName:String(i),location:{coordinates:{latitude:lat,longitude:0}} }, strawDetails:{quantity:1,quantityUnit:'quintal'} }));
  const router = load(source('routes/maps.js'), {
    '../middleware/auth': { protect:guard, governmentOnly:(q,s,n)=>n(), farmerOnly:(q,s,n)=>n() },
    '../models/Appointment': { find: () => ({ populate:async()=>appointments }) },
    '../config/maps': { getOptimizedRoute:async()=>{throw Error('Unavailable')}, haversineDistance:(a,b)=>Math.abs(a.latitude-b.latitude),calculateFuelCost:()=>0 }
  });
  const request=await serve(t,express,router);
  const r=await request('POST','/government/optimize-route',{appointmentIds:['0','1','2']},header);
  assert.equal(r.status,200);
  // Default depot latitude is >10, so the first stop is 10. Force a depot below both points next.
  appointments[0].farm.location.coordinates.latitude=40;
  appointments[1].farm.location.coordinates.latitude=29;
  appointments[2].farm.location.coordinates.latitude=29;
  const result=await request('POST','/government/optimize-route',{appointmentIds:['0','1','2']},header);
  assert.deepEqual(result.body.stops.map(s=>s.appointmentId), ['1','2','0']);
  assert.equal(result.body.stops[0].coordinates.latitude,result.body.route.legs[0].coordinates.latitude);
});

test('password changes increment token version and remain hashed', async () => {
  const User = require('../models/User');
  const user = new User({name:'Test',userType:'farmer',phone:'9876543210',idType:'aadhar',idNumber:'123456789012',email:'test@example.com',password:'new-password'});
  user.isNew=false;
  await new Promise((resolve,reject)=>User.schema.s.hooks.execPre('save',user,[],err=>err?reject(err):resolve()));
  assert.equal(user.tokenVersion,1); assert.notEqual(user.password,'new-password');
  assert.equal(await user.matchPassword('new-password'),true);
});

test('farmer registration still returns a usable token',async t=>{
  const user={_id:'111111111111111111111111',userType:'farmer',name:'Test',email:'test@example.com',tokenVersion:0};
  const router=load(source('routes/auth.js'),{'../models/User':{findOne:async()=>null,create:async()=>user},'../config/notifications':{sendEmail:async()=>{throw Error('No email expected')}}});
  const request=await serve(t,express,router);
  const r=await request('POST','/register',{userType:'farmer',name:'Test',phone:'9876543210',idType:'aadhar',idNumber:'123456789012',email:'test@example.com',password:'testing123'});
  assert.equal(r.status,201);assert.equal(jwt.verify(r.body.token,process.env.JWT_SECRET).id,user._id);
});

test('upgraded email library builds notifications without network delivery',async()=>{
  const nodemailer=require('nodemailer');
  const mailer=nodemailer.createTransport({streamTransport:true,buffer:true});
  const result=await mailer.sendMail({from:'sender@example.com',to:'recipient@example.com',subject:'Local regression test',html:'<p>Notification</p>'});
  assert.ok(result.message.toString().includes('<p>Notification</p>'));
});

test('account limits receive the same normalized email used for login',async t=>{
  let identity;
  const pass=(q,s,n)=>n();
  const router=load(source('routes/auth.js'),{
    '../middleware/rateLimit':{authIpLimiter:pass,authAccountLimiter:(q,s)=>{identity=q.body.email;s.status(429).json({message:'limited'})},resetAccountLimiter:pass},
    '../models/User':{},'../config/notifications':{}
  });
  const request=await serve(t,express,router);
  assert.equal((await request('POST','/login',{email:'Test.Name+alias@gmail.com',password:'password'})).status,429);
  assert.equal(identity,'testname@gmail.com');
});

test('farm schema rejects negative areas, yields and invalid coordinates',()=>{
 const Farm=require('../models/Farm');
 const base={farmer:'111111111111111111111111',farmName:'Test',location:{state:'Punjab',district:'Test'},totalArea:1};
 assert.ok(new Farm({...base,totalArea:-5}).validateSync());
 assert.ok(new Farm({...base,location:{...base.location,coordinates:{latitude:91,longitude:181}}}).validateSync());
 for(const field of ['areaUnderCrop','estimatedYield']) {
  assert.ok(new Farm({...base,crops:[{cropName:'Wheat',cropType:'rabi',sowingDate:'2026-01-01',[field]:-1}]}).validateSync());
 }
});

test('AI harvest date rejects invalid calendar dates and unsupported crop windows',()=>{
 const parse=require('../utils/harvestDate');
 for(const value of ['garbage','2026-02-30','2025-12-31','2030-01-01',undefined]) assert.throws(()=>parse(value,'2026-01-01'));
 assert.equal(parse('2026-06-01','2026-01-01').toISOString(),'2026-06-01T00:00:00.000Z');
});

test('AI rejects bad harvest dates without saving and applies quotas on every endpoint',async t=>{
 let saves=0,calls=0;let prediction='2026-02-30';
 const crop={cropName:'Wheat',sowingDate:'2026-01-01'};
 const overrides={
  '../middleware/auth':{protect:guard,farmerOnly:(q,s,n)=>n()},
  '../middleware/rateLimit':{aiLimiter:(q,s,n)=>{calls++;n()}},
  '../models/Farm':{findOne:async()=>({crops:{id:()=>crop},location:{},save:async()=>saves++})},
  '../config/gemini':{predictHarvestDate:async()=>({expectedHarvestDate:prediction}),getStrawSellingAdvice:async()=>({}),getCropRecommendations:async()=>({})}
 };
 const request=await serve(t,express,load(source('routes/ai.js'),overrides));
 assert.equal((await request('POST','/predict-harvest',{farmId:'test',cropId:'test'},header)).status,502);assert.equal(saves,0);
 prediction='2026-06-01';assert.equal((await request('POST','/predict-harvest',{farmId:'test',cropId:'test'},header)).status,200);assert.equal(saves,1);
 await request('POST','/straw-advice',{},header);await request('POST','/crop-recommendations',{},header);assert.equal(calls,4);
});
