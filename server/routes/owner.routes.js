const express = require("express");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");

const router = express.Router();

const DATA = path.join(__dirname, "../data/properties.json");

function read(){
  if(!fs.existsSync(DATA)) return [];
  try{
    return JSON.parse(fs.readFileSync(DATA,"utf8"));
  }catch{
    return [];
  }
}

function write(data){
  fs.writeFileSync(DATA,JSON.stringify(data,null,2));
}

function auth(req,res,next){
  try{

    const header=req.headers.authorization || "";
    const token=header.startsWith("Bearer ")
      ? header.slice(7)
      : null;

    if(!token){
      return res.status(401).json({
        success:false,
        error:"Authentication required"
      });
    }

    const user=jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const role=String(
      user.role || user.userRole || ""
    ).toUpperCase();

    if(!["OWNER","ADMIN"].includes(role)){
      return res.status(403).json({
        success:false,
        error:"Owner access required"
      });
    }

    req.user=user;
    next();

  }catch{
    res.status(401).json({
      success:false,
      error:"Invalid or expired token"
    });
  }
}

function uid(user){
  return user.id ||
         user.userId ||
         user._id ||
         user.sub;
}


/* ================================
   MY PROPERTIES
================================ */

router.get("/properties",auth,(req,res)=>{

  const id=uid(req.user);

  const properties=read().filter(
    p=>String(p.owner_id)===String(id)
  );

  res.json({
    success:true,
    properties
  });
});


/* ================================
   DELETE PROPERTY
================================ */

router.delete("/properties/:id",auth,(req,res)=>{

  const properties=read();

  const index=properties.findIndex(
    p=>p.id===req.params.id &&
    String(p.owner_id)===String(uid(req.user))
  );

  if(index===-1){
    return res.status(404).json({
      success:false,
      error:"Property not found"
    });
  }

  const removed=properties.splice(index,1)[0];

  write(properties);

  res.json({
    success:true,
    property:removed
  });
});

module.exports=router;
