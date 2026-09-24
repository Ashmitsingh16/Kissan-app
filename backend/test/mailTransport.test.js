const test = require('node:test');
const assert = require('node:assert/strict');
const { createTransporter } = require('../utils/mailTransport');
const env = { EMAIL_PROVIDER: 'gmail-api', GMAIL_CLIENT_ID: 'fixture-client', GMAIL_CLIENT_SECRET: 'fixture-secret', GMAIL_REFRESH_TOKEN: 'fixture-refresh', GMAIL_USER: 'sender@example.com' };
const mail = { to: 'recipient@example.com', subject: 'Test', html: '<p>Hello</p>', replyTo: 'reply@example.com' };
test('Gmail HTTPS composes MIME and exchanges credentials without SMTP', async () => {
 let calls=0;
 const transport=createTransporter(env,async(url,options)=>{
  calls++; assert.ok(options.signal);
  if(calls===1){assert.equal(url,'https://oauth2.googleapis.com/token');assert.equal(options.body.get('refresh_token'),env.GMAIL_REFRESH_TOKEN);return {ok:true,json:async()=>({access_token:'fixture-access'})};}
  assert.equal(url,'https://gmail.googleapis.com/gmail/v1/users/me/messages/send');
  assert.equal(options.headers.Authorization,'Bearer fixture-access');
  const mime=Buffer.from(JSON.parse(options.body).raw,'base64url').toString();
  for(const text of ['Reply-To: reply@example.com','sender@example.com','<p>Hello</p>'])assert.ok(mime.includes(text));
  return {ok:true,json:async()=>({id:'fixture-id'})};
 });
 assert.deepEqual(await transport.sendMail(mail),{messageId:'fixture-id'});assert.equal(calls,2);
});
test('Gmail validates credentials and headers before network access',async()=>{
 const never=async()=>{throw Error('unexpected network')};
 await assert.rejects(createTransporter({...env,GMAIL_CLIENT_SECRET:''},never).sendMail(mail),/incomplete/);
 await assert.rejects(createTransporter(env,never).sendMail({...mail,subject:'Test\r\nBcc: x@example.com'}),/Invalid email header/);
 assert.throws(()=>createTransporter({EMAIL_PROVIDER:'unknown'}),/Unsupported/);
});
test('Gmail errors do not expose provider responses or retry sends',async()=>{
 for(const failureAt of [1,2]){
 let calls=0;const transport=createTransporter(env,async()=>{
 calls++;if(calls===failureAt)return {ok:false,json:async()=>({error:'private-provider-detail'})};
 return {ok:true,json:async()=>({access_token:'fixture-access'})};});
 await assert.rejects(transport.sendMail(mail),err=>!err.message.includes('private-provider-detail'));assert.equal(calls,failureAt);
 }
});
