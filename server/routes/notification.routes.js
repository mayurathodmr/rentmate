const express=require("express");
const fs=require("fs");
const path=require("path");
const webpush=require("web-push");
const jwt=require("jsonwebtoken");

const router=express.Router();

const FILE=
  path.join(__dirname,"../data/push-subscriptions.json");

if(!fs.existsSync(FILE)){
  fs.writeFileSync(FILE,"[]");
}

function read(){

  try{
    return JSON.parse(
      fs.readFileSync(FILE,"utf8")
    );
  }catch{
    return [];
  }
}

function write(x){
  fs.writeFileSync(
    FILE,
    JSON.stringify(x,null,2)
  );
}

function auth(req,res,next){

  try{

    const h=req.headers.authorization||"";

    if(!h.startsWith("Bearer "))
      return res.status(401).json({
        success:false,
        error:"Authentication required"
      });

    req.user=jwt.verify(
      h.slice(7),
      process.env.JWT_SECRET
    );

    next();

  }catch{

    res.status(401).json({
      success:false,
      error:"Invalid token"
    });
  }
}

function uid(u){
  return u.id||u.userId||u._id||u.sub;
}


/*
 VAPID keys are read from .env.
*/

if(
  process.env.VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY &&
  process.env.VAPID_EMAIL
){

  webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}


router.get("/public-key",(req,res)=>{

  if(!process.env.VAPID_PUBLIC_KEY){

    return res.status(503).json({
      success:false,
      error:"Push notifications are not configured"
    });
  }

  res.json({
    success:true,
    publicKey:process.env.VAPID_PUBLIC_KEY
  });
});


router.post("/subscribe",auth,(req,res)=>{

  const subscription=req.body.subscription;

  if(
    !subscription ||
    !subscription.endpoint
  ){

    return res.status(400).json({
      success:false,
      error:"Invalid subscription"
    });
  }

  const list=read();

  const id=String(uid(req.user));

  const existing=list.findIndex(
    x=>String(x.user_id)===id &&
       x.subscription?.endpoint===
       subscription.endpoint
  );

  const item={
    user_id:id,
    subscription,
    created_at:new Date().toISOString()
  };

  if(existing>=0)
    list[existing]=item;
  else
    list.push(item);

  write(list);

  res.json({
    success:true
  });
});


router.post("/send",auth,async(req,res)=>{

  const role=String(
    req.user.role||req.user.userRole||""
  ).toUpperCase();

  if(role!=="ADMIN"){

    return res.status(403).json({
      success:false,
      error:"Admin access required"
    });
  }

  if(!process.env.VAPID_PUBLIC_KEY){

    return res.status(503).json({
      success:false,
      error:"Push notifications are not configured"
    });
  }

  const payload=JSON.stringify({
    title:String(req.body.title||"RentMate"),
    body:String(req.body.body||"New rental update"),
    url:String(req.body.url||"/")
  });

  const list=read();

  let sent=0;

  for(const item of list){

    try{

      await webpush.sendNotification(
        item.subscription,
        payload
      );

      sent++;

    }catch(err){

      /*
       Remove expired subscriptions.
      */

      if(
        err.statusCode===404 ||
        err.statusCode===410
      ){

        const i=list.indexOf(item);

        if(i>=0)
          list.splice(i,1);
      }
    }
  }

  write(list);

  res.json({
    success:true,
    sent
  });
});

module.exports=router;
