const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const router = express.Router();

const dataDir = path.join(__dirname, "..", "data");
const favFile = path.join(dataDir, "favorites.json");
const enquiryFile = path.join(dataDir, "enquiries.json");

function ensure(file){
  if(!fs.existsSync(dataDir)){
    fs.mkdirSync(dataDir,{recursive:true});
  }

  if(!fs.existsSync(file)){
    fs.writeFileSync(file,"[]");
  }
}

function read(file){
  ensure(file);

  try{
    const data=JSON.parse(fs.readFileSync(file,"utf8"));
    return Array.isArray(data) ? data : [];
  }catch{
    return [];
  }
}

function write(file,data){
  ensure(file);
  fs.writeFileSync(
    file,
    JSON.stringify(data,null,2)
  );
}

function auth(req,res,next){

  const header=req.headers.authorization || "";

  if(!header.startsWith("Bearer ")){
    return res.status(401).json({
      success:false,
      error:"Login required"
    });
  }

  try{

    const token=header.slice(7);

    const decoded=jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user=decoded;

    next();

  }catch{

    return res.status(401).json({
      success:false,
      error:"Invalid or expired session"
    });
  }
}

function userId(req){

  return String(
    req.user?.id ||
    req.user?.userId ||
    req.user?._id ||
    req.user?.sub ||
    ""
  );
}


/* =========================================================
   FAVOURITES
========================================================= */

router.get("/favorites",auth,(req,res)=>{

  const id=userId(req);

  const favorites=read(favFile)
    .filter(x=>x.user_id===id);

  res.json({
    success:true,
    favorites
  });
});


router.post("/favorites/:propertyId",auth,(req,res)=>{

  const id=userId(req);
  const propertyId=String(req.params.propertyId);

  if(!id || !propertyId){
    return res.status(400).json({
      success:false,
      error:"Invalid request"
    });
  }

  const all=read(favFile);

  const exists=all.find(
    x=>x.user_id===id &&
        x.property_id===propertyId
  );

  if(!exists){

    all.push({
      id:crypto.randomUUID(),
      user_id:id,
      property_id:propertyId,
      created_at:new Date().toISOString()
    });

    write(favFile,all);
  }

  res.json({
    success:true,
    saved:true
  });
});


router.delete("/favorites/:propertyId",auth,(req,res)=>{

  const id=userId(req);
  const propertyId=String(req.params.propertyId);

  const all=read(favFile);

  const updated=all.filter(
    x=>!(
      x.user_id===id &&
      x.property_id===propertyId
    )
  );

  write(favFile,updated);

  res.json({
    success:true,
    saved:false
  });
});


/* =========================================================
   ENQUIRIES
========================================================= */

router.post("/enquiries",auth,(req,res)=>{

  const id=userId(req);

  const propertyId=String(
    req.body?.property_id || ""
  );

  const message=String(
    req.body?.message || ""
  ).trim();

  if(!propertyId){
    return res.status(400).json({
      success:false,
      error:"Property ID is required"
    });
  }

  const all=read(enquiryFile);

  const enquiry={
    id:crypto.randomUUID(),
    property_id:propertyId,
    user_id:id,
    message:message || "I am interested in this property.",
    status:"SENT",
    created_at:new Date().toISOString(),
    updated_at:new Date().toISOString()
  };

  all.push(enquiry);

  write(enquiryFile,all);

  res.status(201).json({
    success:true,
    enquiry
  });
});


router.get("/enquiries",auth,(req,res)=>{

  const id=userId(req);

  const enquiries=read(enquiryFile)
    .filter(x=>x.user_id===id)
    .sort(
      (a,b)=>
        new Date(b.created_at) -
        new Date(a.created_at)
    );

  res.json({
    success:true,
    enquiries
  });
});


module.exports=router;
