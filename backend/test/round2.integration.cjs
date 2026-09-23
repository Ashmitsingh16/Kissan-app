const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const crypto=require('node:crypto');
const mongoose=require('mongoose');
const express=require('express');
const {load,serve}=require('./helpers.cjs');
const Appointment=require('../models/Appointment');
const Farm=require('../models/Farm');
const User=require('../models/User');
const CollectionRoute=require('../models/CollectionRoute');
const base=file=>path.join(__dirname,'..',file);
let farmer,farm,officer,notifications=[];
const guard=(req,res,next)=>{req.user=officer;next()};
before(async()=>{
 const uri=process.env.TEST_MONGO_URI;
 if(!uri || !/^mongodb:\/\/(127\.0\.0\.1|localhost):/.test(uri)) throw Error('Set TEST_MONGO_URI to an isolated local MongoDB replica set');
 await mongoose.connect(uri,{dbName:`kissan_${crypto.randomBytes(6).toString('hex')}_test`});
 await Promise.all([User.init(),Farm.init(),Appointment.init(),CollectionRoute.init()]);
 farmer=await User.create({userType:'farmer',name:'Synthetic',phone:'9876543210',idType:'aadhar',idNumber:'123456789012',email:'farmer@example.com',password:'test-password'});
 officer={_id:new mongoose.Types.ObjectId(),userType:'government',isVerified:true};
 farm=await Farm.create({farmer:farmer._id,farmName:'Test',location:{state:'Punjab',district:'Test'},totalArea:1});
});
after(async()=>{if(mongoose.connection.readyState){await mongoose.connection.dropDatabase();await mongoose.disconnect()}});
async function fixture(status='pending'){
 return Appointment.create({farmer:farmer._id,farm:farm._id,strawDetails:{cropType:'wheat',quantity:2,quantityUnit:'quintal'},preferredDate:new Date(),status,
 verification:{isVerified:['verified','truck_dispatched','collected','completed'].includes(status)}});
}
function appointments(){return load(base('routes/appointment.js'),{'../middleware/auth':{protect:guard,farmerOnly:guard,governmentOnly:guard},'../config/notifications':{sendNotification:async(name)=>notifications.push(name)}})}
function maps(){return load(base('routes/maps.js'),{'../middleware/auth':{protect:guard,farmerOnly:guard,governmentOnly:guard}})}

test('invalid amounts and out-of-order actions do not modify stored appointments',async t=>{
 const request=await serve(t,express,appointments());const a=await fixture('cancelled');
 let r=await request('PUT',`/government/${a.id}/collect`,{actualQuantity:-10,qualityGrade:'A'});assert.equal(r.status,400);
 r=await request('PUT',`/government/${a.id}/collect`,{actualQuantity:10,qualityGrade:'A'});assert.equal(r.status,409);
 r=await request('PUT',`/government/${a.id}/verify`,{});assert.equal(r.status,409);
 r=await request('PUT',`/government/${a.id}/status`,{status:'completed'});assert.equal(r.status,409);
 r=await request('PUT',`/government/${a.id}/payment`,{transactionId:'test',paymentAmount:-500});assert.equal(r.status,400);
 assert.equal((await Appointment.findById(a.id)).status,'cancelled');
});

test('valid collection computes payment; concurrent payment requests commit only once',async t=>{
 notifications=[];const request=await serve(t,express,appointments());const a=await fixture();
 assert.equal((await request('PUT',`/government/${a.id}/verify`,{})).status,200);
 assert.equal((await request('PUT',`/government/${a.id}/dispatch-truck`,{vehicleNumber:'TEST',driverName:'Test'})).status,200);
 assert.equal((await request('PUT',`/government/${a.id}/collect`,{actualQuantity:2,qualityGrade:'A'})).body.finalPayment,440);
 assert.equal((await request('PUT',`/government/${a.id}/payment`,{transactionId:'test',paymentAmount:441})).status,400);
 const results=await Promise.all([request('PUT',`/government/${a.id}/payment`,{transactionId:'test',paymentAmount:440}),request('PUT',`/government/${a.id}/payment`,{transactionId:'test',paymentAmount:440})]);
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 assert.equal(notifications.filter(name=>name==='paymentProcessed').length,1);
 const saved=await Appointment.findById(a.id);assert.equal(saved.paymentAmount,440);assert.equal(saved.paymentStatus,'completed');
 assert.equal((await request('PUT',`/government/${a.id}/collect`,{actualQuantity:3,qualityGrade:'A'})).status,409);
});

test('bulk routing preserves verification state and refuses terminal bookings',async t=>{
 const request=await serve(t,express,maps());const a=await fixture('pending'),done=await fixture('completed');
 const payload={routeDate:new Date().toISOString(),appointmentIds:[a.id,done.id],truckDetails:{vehicleNumber:'TEST'}};
 assert.equal((await request('POST','/government/create-collection-route',payload)).status,409);
 assert.equal(await CollectionRoute.countDocuments(),0);assert.equal((await Appointment.findById(a.id)).truckDetails.routeId,undefined);
 const b=await fixture('verified');payload.appointmentIds=[a.id,b.id];
 const created=await request('POST','/government/create-collection-route',payload);assert.equal(created.status,201);
 assert.equal((await Appointment.findById(b.id)).status,'verified');
 const id=created.body.route._id;
 assert.equal((await request('PUT',`/government/routes/${id}/start`,{})).status,409);
 assert.equal((await Appointment.findById(b.id)).status,'verified');
 const doc=await Appointment.findById(a.id);doc.status='verified';doc.verification.isVerified=true;await doc.save();
 assert.equal((await request('PUT',`/government/routes/${id}/start`,{})).status,200);
 assert.equal((await request('PUT',`/government/routes/${id}/start`,{})).status,409);
 assert.equal((await Appointment.findById(a.id)).status,'truck_dispatched');
});

test('farmer cannot invoke the government weather notification endpoint',async t=>{
 let calls=0;const {governmentOnly}=require('../middleware/auth');
 const router=load(base('routes/notifications.js'),{'../middleware/auth':{protect:(q,s,n)=>{q.user=farmer;n()},governmentOnly},'../config/notifications':{sendNotification:async()=>calls++}});
 const request=await serve(t,express,router);
 assert.equal((await request('POST','/weather-alert',{farmerId:farmer.id})).status,403);assert.equal(calls,0);
});

test('shared limits reject concurrent excess requests and reset after the window',async t=>{
 const {createLimiter}=require('../middleware/rateLimit');let now=1000;
 const make=()=>createLimiter({scope:'integration',limit:3,windowMs:10000,key:()=> 'same-account',now:()=>now});
 const router=express.Router();router.get('/one',make(),(q,s)=>s.json({ok:true}));router.get('/two',make(),(q,s)=>s.json({ok:true}));
 const request=await serve(t,express,router);
 const results=await Promise.all(Array.from({length:10},(_,i)=>request('GET',i%2?'/one':'/two')));
 assert.equal(results.filter(r=>r.status===200).length,3);assert.equal(results.filter(r=>r.status===429).length,7);
 now=11000;assert.equal((await request('GET','/one')).status,200);
});

test('farm edits reject invalid areas and deactivated farms cannot receive bookings',async t=>{
 const auth={protect:(q,s,n)=>{q.user=farmer;n()},farmerOnly:(q,s,n)=>n()};
 const request=await serve(t,express,load(base('routes/farm.js'),{'../middleware/auth':auth}));
 assert.equal((await request('PUT',`/${farm.id}`,{totalArea:-5})).status,400);
 assert.equal((await Farm.findById(farm.id)).totalArea,1);
 assert.equal((await request('PUT',`/${farm.id}`,{crops:[{cropName:'Wheat',cropType:'rabi',sowingDate:'2026-01-01',areaUnderCrop:-1}]})).status,400);
 assert.equal((await request('DELETE',`/${farm.id}`)).status,200);
 const appointments=await serve(t,express,load(base('routes/appointment.js'),{'../middleware/auth':{...auth,governmentOnly:(q,s,n)=>n()},'../config/notifications':{sendNotification:async()=>{throw Error('Unexpected send')}}}));
 const count=await Appointment.countDocuments();
 assert.equal((await appointments('POST','/',{farm:farm.id,strawDetails:{cropType:'wheat',quantity:2,quantityUnit:'quintal'},preferredDate:'2026-10-01',preferredTimeSlot:'morning'})).status,404);
 assert.equal(await Appointment.countDocuments(),count);
});
