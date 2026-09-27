const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const multer = require("multer");

const router = express.Router();

const DATA_FILE =
  path.join(__dirname, "..", "data", "properties.json");

const UPLOAD_DIR =
  path.join(__dirname, "..", "..", "uploads", "properties");

fs.mkdirSync(
  path.dirname(DATA_FILE),
  { recursive:true }
);

fs.mkdirSync(
  UPLOAD_DIR,
  { recursive:true }
);

function readProperties(){

  try{

    if(!fs.existsSync(DATA_FILE)){
      fs.writeFileSync(DATA_FILE,"[]");
    }

    const data =
      JSON.parse(
        fs.readFileSync(DATA_FILE,"utf8")
      );

    return Array.isArray(data)
      ? data
      : [];

  }catch(error){

    console.error(
      "Properties database read error:",
      error
    );

    return [];
  }
}

function writeProperties(properties){

  const temp =
    DATA_FILE + ".tmp";

  fs.writeFileSync(
    temp,
    JSON.stringify(
      properties,
      null,
      2
    )
  );

  fs.renameSync(
    temp,
    DATA_FILE
  );
}


/* ==========================================
   AUTH
========================================== */

function requireOwner(req,res,next){

  const header =
    req.headers.authorization || "";

  if(!header.startsWith("Bearer ")){

    return res.status(401).json({
      success:false,
      error:"Authentication required"
    });
  }

  const token =
    header.slice(7);

  try{

    const secret =
      process.env.JWT_SECRET;

    if(!secret){

      return res.status(500).json({
        success:false,
        error:"JWT_SECRET is not configured"
      });
    }

    const decoded =
      jwt.verify(
        token,
        secret
      );

    const role =
      String(
        decoded.role ||
        decoded.userRole ||
        ""
      ).toUpperCase();

    if(
      role !== "OWNER" &&
      role !== "ADMIN"
    ){

      return res.status(403).json({
        success:false,
        error:"Owner access required"
      });
    }

    req.user = decoded;

    next();

  }catch(error){

    return res.status(401).json({
      success:false,
      error:"Invalid or expired authentication token"
    });
  }
}


/* ==========================================
   IMAGE UPLOAD
========================================== */

const storage =
  multer.diskStorage({

    destination:
      function(req,file,cb){

        cb(
          null,
          UPLOAD_DIR
        );
      },

    filename:
      function(req,file,cb){

        const ext =
          path.extname(
            file.originalname
          ).toLowerCase();

        const safeExt =
          [
            ".jpg",
            ".jpeg",
            ".png",
            ".webp",
            ".gif"
          ].includes(ext)
            ? ext
            : ".jpg";

        cb(
          null,
          Date.now() +
          "-" +
          crypto.randomBytes(8).toString("hex") +
          safeExt
        );
      }

  });

const upload =
  multer({

    storage,

    limits:{
      files:10,
      fileSize:8 * 1024 * 1024
    },

    fileFilter:
      function(req,file,cb){

        if(
          file.mimetype &&
          file.mimetype.startsWith("image/")
        ){

          cb(null,true);

        }else{

          cb(
            new Error(
              "Only image files are allowed"
            )
          );
        }
      }

  });


/* ==========================================
   HELPERS
========================================== */

function numberOrNull(value){

  if(
    value === undefined ||
    value === null ||
    value === ""
  ){
    return null;
  }

  const n =
    Number(value);

  return Number.isFinite(n)
    ? n
    : null;
}

function cleanString(value){

  return typeof value === "string"
    ? value.trim()
    : "";
}

function parseAmenities(value){

  if(Array.isArray(value)){
    return value;
  }

  if(typeof value !== "string"){
    return [];
  }

  try{

    const parsed =
      JSON.parse(value);

    return Array.isArray(parsed)
      ? parsed
      : [];

  }catch{

    return value
      .split(",")
      .map(x => x.trim())
      .filter(Boolean);
  }
}

function ownerId(req){

  return String(
    req.user?.id ||
    req.user?.userId ||
    req.user?._id ||
    req.user?.sub ||
    ""
  );
}


/* ==========================================
   CREATE REAL PROPERTY
========================================== */

router.post(
  "/",
  requireOwner,
  function(req,res){

    upload.array("images",10)(
      req,
      res,
      function(uploadError){

        if(uploadError){

          return res.status(400).json({
            success:false,
            error:uploadError.message
          });
        }

        try{

          const title =
            cleanString(req.body.title);

          const propertyType =
            cleanString(
              req.body.property_type
            );

          const area =
            cleanString(req.body.area);

          const city =
            cleanString(req.body.city);

          const rent =
            numberOrNull(req.body.rent);

          const latitude =
            numberOrNull(req.body.latitude);

          const longitude =
            numberOrNull(req.body.longitude);

          if(!title){

            return res.status(400).json({
              success:false,
              error:"Property title is required"
            });
          }

          if(!propertyType){

            return res.status(400).json({
              success:false,
              error:"Property type is required"
            });
          }

          if(!area || !city){

            return res.status(400).json({
              success:false,
              error:"Area and city are required"
            });
          }

          if(
            rent === null ||
            rent <= 0
          ){

            return res.status(400).json({
              success:false,
              error:"Valid monthly rent is required"
            });
          }

          if(
            latitude === null ||
            longitude === null ||
            latitude < -90 ||
            latitude > 90 ||
            longitude < -180 ||
            longitude > 180
          ){

            return res.status(400).json({
              success:false,
              error:"Valid property latitude and longitude are required"
            });
          }

          const files =
            Array.isArray(req.files)
              ? req.files
              : [];

          const images =
            files.map(
              file =>
                "/uploads/properties/" +
                file.filename
            );

          const properties =
            readProperties();

          const now =
            new Date().toISOString();

          const property = {

            id:
              crypto.randomUUID(),

            owner_id:
              ownerId(req),

            title,

            property_type:
              propertyType,

            bhk:
              cleanString(req.body.bhk),

            rent,

            deposit:
              numberOrNull(
                req.body.deposit
              ) || 0,

            area,

            locality:
              area,

            city,

            state:
              cleanString(req.body.state),

            area_sqft:
              numberOrNull(
                req.body.area_sqft
              ),

            furnishing:
              cleanString(
                req.body.furnishing
              ),

            available_from:
              cleanString(
                req.body.available_from
              ),

            latitude,

            longitude,

            amenities:
              parseAmenities(
                req.body.amenities
              ),

            description:
              cleanString(
                req.body.description
              ),

            images,

            status:"PENDING",

            verification_status:
              "PENDING",

            created_at:now,

            updated_at:now
          };

          properties.push(property);

          writeProperties(properties);

          return res.status(201).json({
            success:true,
            message:
              "Property submitted for verification",
            property
          });

        }catch(error){

          console.error(
            "Create property error:",
            error
          );

          return res.status(500).json({
            success:false,
            error:"Unable to save property"
          });
        }

      }
    );

  }
);


/* ==========================================
   REAL PROPERTY LIST
========================================== */

router.get(
  "/",
  function(req,res){

    try{

      let properties =
        readProperties();

      /*
        Only APPROVED listings are public.
        Pending owner listings are never exposed
        to normal users.
      */

      properties =
        properties.filter(
          property =>
            String(
              property.status || ""
            ).toUpperCase()
            === "APPROVED"
        );

      const city =
        cleanString(
          req.query.city
        ).toLowerCase();

      const type =
        cleanString(
          req.query.type
        ).toLowerCase();

      const maxRent =
        numberOrNull(
          req.query.maxRent
        );

      const userLat =
        numberOrNull(
          req.query.latitude
        );

      const userLng =
        numberOrNull(
          req.query.longitude
        );

      const radius =
        numberOrNull(
          req.query.radius
        ) || 10;

      if(city){

        properties =
          properties.filter(
            p =>
              String(
                p.city || ""
              ).toLowerCase()
              .includes(city)
              ||
              String(
                p.area || ""
              ).toLowerCase()
              .includes(city)
          );
      }

      if(type){

        properties =
          properties.filter(
            p =>
              String(
                p.property_type || ""
              ).toLowerCase()
              === type
          );
      }

      if(maxRent !== null){

        properties =
          properties.filter(
            p =>
              Number(p.rent || 0)
              <= maxRent
          );
      }

      /*
        Nearby filtering.
      */

      if(
        userLat !== null &&
        userLng !== null
      ){

        properties =
          properties
          .map(property => {

            const lat =
              numberOrNull(
                property.latitude
              );

            const lng =
              numberOrNull(
                property.longitude
              );

            if(
              lat === null ||
              lng === null
            ){
              return null;
            }

            property =
              {
                ...property,
                distance_km:
                  distanceKm(
                    userLat,
                    userLng,
                    lat,
                    lng
                  )
              };

            return property;

          })
          .filter(Boolean)
          .filter(
            p =>
              p.distance_km <= radius
          )
          .sort(
            (a,b) =>
              a.distance_km -
              b.distance_km
          );
      }

      const limit =
        Math.min(
          Math.max(
            Number(req.query.limit) || 20,
            1
          ),
          100
        );

      properties =
        properties.slice(0,limit);

      return res.json({
        success:true,
        count:properties.length,
        properties
      });

    }catch(error){

      console.error(error);

      return res.status(500).json({
        success:false,
        error:"Unable to load properties"
      });
    }
  }
);


/* ==========================================
   SINGLE PROPERTY
========================================== */

router.get(
  "/:id",
  function(req,res){

    const properties =
      readProperties();

    const property =
      properties.find(
        p =>
          String(p.id) ===
          String(req.params.id)
      );

    if(!property){

      return res.status(404).json({
        success:false,
        error:"Property not found"
      });
    }

    /*
      Do not expose pending/rejected
      listings publicly.
    */

    if(
      String(property.status)
      .toUpperCase()
      !== "APPROVED"
    ){

      return res.status(404).json({
        success:false,
        error:"Property is not publicly available"
      });
    }

    return res.json({
      success:true,
      property
    });
  }
);


/* ==========================================
   HAVERSINE DISTANCE
========================================== */

function distanceKm(
  lat1,
  lon1,
  lat2,
  lon2
){

  const R = 6371;

  const dLat =
    (lat2-lat1) *
    Math.PI / 180;

  const dLon =
    (lon2-lon1) *
    Math.PI / 180;

  const a =
    Math.sin(dLat/2) ** 2 +
    Math.cos(lat1*Math.PI/180) *
    Math.cos(lat2*Math.PI/180) *
    Math.sin(dLon/2) ** 2;

  return R *
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1-a)
    );
}


module.exports = router;
