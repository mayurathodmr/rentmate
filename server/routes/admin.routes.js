const express = require("express");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");

const router = express.Router();

const DATA = path.join(__dirname, "../data/properties.json");

function read() {
  if (!fs.existsSync(DATA)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA, "utf8"));
  } catch {
    return [];
  }
}

function write(data) {
  fs.writeFileSync(DATA, JSON.stringify(data, null, 2));
}

function auth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ")
      ? header.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({
        success:false,
        error:"Authentication required"
      });
    }

    const user = jwt.verify(token, process.env.JWT_SECRET);

    if (!["ADMIN"].includes(String(user.role || user.userRole).toUpperCase())) {
      return res.status(403).json({
        success:false,
        error:"Admin access required"
      });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({
      success:false,
      error:"Invalid or expired token"
    });
  }
}


/* ================================
   PENDING PROPERTIES
================================ */

router.get("/properties/pending", auth, (req,res)=>{
  const properties = read().filter(
    p => p.status === "PENDING"
  );

  res.json({
    success:true,
    properties
  });
});


/* ================================
   ALL PROPERTIES
================================ */

router.get("/properties", auth, (req,res)=>{
  res.json({
    success:true,
    properties:read()
  });
});


/* ================================
   APPROVE / REJECT
================================ */

router.patch("/properties/:id/status", auth, (req,res)=>{

  const { status, reason } = req.body;

  if (!["APPROVED","REJECTED"].includes(status)) {
    return res.status(400).json({
      success:false,
      error:"Invalid status"
    });
  }

  const properties = read();

  const index = properties.findIndex(
    p => p.id === req.params.id
  );

  if (index === -1) {
    return res.status(404).json({
      success:false,
      error:"Property not found"
    });
  }

  properties[index].status = status;
  properties[index].verification_status = status;
  properties[index].verified_at = new Date().toISOString();

  if (status === "REJECTED") {
    properties[index].rejection_reason =
      String(reason || "Property did not pass verification.");
  } else {
    properties[index].rejection_reason = null;
  }

  properties[index].updated_at =
    new Date().toISOString();

  write(properties);

  res.json({
    success:true,
    property:properties[index]
  });
});

module.exports = router;
