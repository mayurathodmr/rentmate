const express=require("express");
const fs=require("fs");
const path=require("path");
const jwt=require("jsonwebtoken");

const router=express.Router();

function read(name){

  const f=path.join(
    __dirname,
    "../data/"+name+".json"
  );

  if(!fs.existsSync(f))return [];

  try{
    return JSON.parse(
      fs.readFileSync(f,"utf8")
    );
  }catch{
    return [];
  }
}

function auth(req,res,next){

  try{

    const h=req.headers.authorization||"";

    if(!h.startsWith("Bearer "))
      return res.status(401).json({
        success:false,
        error:"Authentication required"
      });

    const u=jwt.verify(
      h.slice(7),
      process.env.JWT_SECRET
    );

    const r=String(
      u.role||u.userRole||""
    ).toUpperCase();

    if(r!=="ADMIN")
      return res.status(403).json({
        success:false,
        error:"Admin access required"
      });

    req.user=u;
    next();

  }catch{

    res.status(401).json({
      success:false,
      error:"Invalid token"
    });
  }
}


router.get("/users",auth,(req,res)=>{

  const users=read("users");

  /*
    Do not expose passwords/tokens.
  */

  const safe=users.map(u=>{

    const x={...u};

    delete x.password;
    delete x.passwordHash;
    delete x.token;

    return x;
  });

  res.json({
    success:true,
    users:safe
  });
});


router.get("/reports",auth,(req,res)=>{

  const properties=read("properties");
  const users=read("users");
  const enquiries=read("enquiries");

  const approved=
    properties.filter(
      p=>p.status==="APPROVED"
    ).length;

  const pending=
    properties.filter(
      p=>p.status==="PENDING"
    ).length;

  const rejected=
    properties.filter(
      p=>p.status==="REJECTED"
    ).length;

  res.json({
    success:true,
    reports:{
      users:users.length,
      properties:properties.length,
      approved,
      pending,
      rejected,
      enquiries:enquiries.length
    }
  });
});

module.exports=router;
