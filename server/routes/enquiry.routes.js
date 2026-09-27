const express=require("express");
const fs=require("fs");
const path=require("path");
const jwt=require("jsonwebtoken");

const router=express.Router();

const ENQ=path.join(__dirname,"../data/enquiries.json");
const PROPS=path.join(__dirname,"../data/properties.json");

function read(file){
  if(!fs.existsSync(file)) return [];
  try{return JSON.parse(fs.readFileSync(file,"utf8"))}
  catch{return []}
}

function write(file,data){
  fs.writeFileSync(file,JSON.stringify(data,null,2));
}

function auth(req,res,next){

  try{

    const h=req.headers.authorization||"";
    const token=h.startsWith("Bearer ")
      ? h.slice(7)
      : null;

    if(!token)
      return res.status(401).json({
        success:false,
        error:"Authentication required"
      });

    req.user=jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    next();

  }catch{

    res.status(401).json({
      success:false,
      error:"Invalid or expired token"
    });
  }
}

function uid(u){
  return u.id||u.userId||u._id||u.sub;
}

function role(u){
  return String(
    u.role||u.userRole||""
  ).toUpperCase();
}


/*
 USER SEND ENQUIRY
*/

router.post("/",auth,(req,res)=>{

  const propertyId=
    String(req.body.property_id||"").trim();

  const message=
    String(req.body.message||"").trim();

  if(!propertyId||!message){

    return res.status(400).json({
      success:false,
      error:"Property and message are required"
    });
  }

  const properties=read(PROPS);

  const property=properties.find(
    p=>p.id===propertyId &&
       p.status==="APPROVED"
  );

  if(!property){

    return res.status(404).json({
      success:false,
      error:"Approved property not found"
    });
  }

  const enquiries=read(ENQ);

  const item={
    id:require("crypto").randomUUID(),
    property_id:propertyId,
    owner_id:property.owner_id,
    user_id:uid(req.user),
    message,
    status:"SENT",
    created_at:new Date().toISOString(),
    updated_at:new Date().toISOString()
  };

  enquiries.push(item);

  write(ENQ,enquiries);

  res.status(201).json({
    success:true,
    enquiry:item
  });
});


/*
 USER ENQUIRIES
*/

router.get("/mine",auth,(req,res)=>{

  const id=uid(req.user);

  const list=read(ENQ).filter(
    e=>String(e.user_id)===String(id)
  );

  res.json({
    success:true,
    enquiries:list
  });
});


/*
 OWNER ENQUIRIES
*/

router.get("/owner",auth,(req,res)=>{

  const r=role(req.user);

  if(r!=="OWNER"&&r!=="ADMIN"){

    return res.status(403).json({
      success:false,
      error:"Owner access required"
    });
  }

  const id=uid(req.user);

  const properties=read(PROPS);

  const owned=new Set(
    properties
      .filter(p=>String(p.owner_id)===String(id))
      .map(p=>p.id)
  );

  const list=read(ENQ).filter(
    e=>owned.has(e.property_id)
  );

  res.json({
    success:true,
    enquiries:list
  });
});


/*
 UPDATE ENQUIRY STATUS
*/

router.patch("/:id/status",auth,(req,res)=>{

  const newStatus=
    String(req.body.status||"").toUpperCase();

  const allowed=[
    "SENT",
    "VIEWED",
    "CONTACTED",
    "CLOSED"
  ];

  if(!allowed.includes(newStatus)){

    return res.status(400).json({
      success:false,
      error:"Invalid enquiry status"
    });
  }

  const properties=read(PROPS);
  const enquiries=read(ENQ);
  const id=uid(req.user);
  const r=role(req.user);

  const index=enquiries.findIndex(
    e=>e.id===req.params.id
  );

  if(index===-1){

    return res.status(404).json({
      success:false,
      error:"Enquiry not found"
    });
  }

  const e=enquiries[index];

  const property=properties.find(
    p=>p.id===e.property_id
  );

  const isOwner=
    property &&
    String(property.owner_id)===String(id);

  const isUser=
    String(e.user_id)===String(id);

  if(!isOwner&&!isUser&&r!=="ADMIN"){

    return res.status(403).json({
      success:false,
      error:"Access denied"
    });
  }

  e.status=newStatus;
  e.updated_at=new Date().toISOString();

  write(ENQ,enquiries);

  res.json({
    success:true,
    enquiry:e
  });
});

module.exports=router;
