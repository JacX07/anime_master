import { betterAuth } from 'better-auth';
const auth=betterAuth({baseURL:'http://localhost:3999',secret:'disposable-local-audit-secret-32-characters',emailAndPassword:{enabled:true},rateLimit:{enabled:true,window:60,max:2}});
const direct=[];for(let i=0;i<5;i++){try{await auth.api.signInEmail({body:{email:'absent@example.invalid',password:'invalid-password'}});direct.push('accepted');}catch(e){direct.push(e.statusCode??e.status);}}
const http=[];for(let i=0;i<5;i++){const r=await auth.handler(new Request('http://localhost:3999/api/auth/sign-in/email',{method:'POST',headers:{'content-type':'application/json','x-forwarded-for':'127.0.0.1','origin':'http://localhost:3999'},body:JSON.stringify({email:'absent@example.invalid',password:'invalid-password'})}));http.push(r.status);}
console.log(JSON.stringify({direct,http}));
