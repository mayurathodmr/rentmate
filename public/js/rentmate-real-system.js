(function(){

"use strict";

const token=
  localStorage.getItem("rentmate_token");

window.RentMateReal={

  async requestLocation(){

    if(!navigator.geolocation){

      throw new Error(
        "Location is not supported by this browser."
      );
    }

    return new Promise(
      (resolve,reject)=>{

        navigator.geolocation.getCurrentPosition(

          position=>{

            const data={
              latitude:position.coords.latitude,
              longitude:position.coords.longitude,
              accuracy:position.coords.accuracy,
              updated_at:new Date().toISOString()
            };

            localStorage.setItem(
              "rentmate_location",
              JSON.stringify(data)
            );

            resolve(data);
          },

          error=>{

            reject(
              new Error(
                error.code===1
                ? "Location permission was denied."
                : "Unable to get your current location."
              )
            );

          },

          {
            enableHighAccuracy:true,
            timeout:12000,
            maximumAge:30000
          }
        );
      }
    );
  },


  async enableNotifications(){

    if(!("Notification" in window)){

      throw new Error(
        "Browser notifications are not supported."
      );
    }

    if(!("serviceWorker" in navigator)){

      throw new Error(
        "Service Worker is not supported."
      );
    }

    const permission=
      await Notification.requestPermission();

    if(permission!=="granted"){

      throw new Error(
        "Notification permission was not granted."
      );
    }

    if(!token){

      throw new Error(
        "Please login before enabling notifications."
      );
    }

    const registration=
      await navigator.serviceWorker.register(
        "/sw.js"
      );

    const r=await fetch(
      "/api/notifications/public-key"
    );

    const data=await r.json();

    if(!r.ok)
      throw new Error(
        data.error||"Push service unavailable."
      );

    const applicationServerKey=
      this.base64ToUint8Array(
        data.publicKey
      );

    const subscription=
      await registration.pushManager.subscribe({
        userVisibleOnly:true,
        applicationServerKey
      });

    const save=await fetch(
      "/api/notifications/subscribe",
      {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          Authorization:"Bearer "+token
        },
        body:JSON.stringify({
          subscription
        })
      }
    );

    const result=await save.json();

    if(!save.ok)
      throw new Error(
        result.error||"Subscription failed."
      );

    localStorage.setItem(
      "rentmate_notifications",
      "enabled"
    );

    return true;
  },


  base64ToUint8Array(base64String){

    const padding="=".repeat(
      (4-base64String.length%4)%4
    );

    const base64=
      (base64String+padding)
      .replace(/-/g,"+")
      .replace(/_/g,"/");

    const rawData=
      atob(base64);

    return Uint8Array.from(
      [...rawData].map(
        char=>char.charCodeAt(0)
      )
    );
  },


  async nearby(){

    const loc=
      await this.requestLocation();

    const params=
      new URLSearchParams({
        latitude:loc.latitude,
        longitude:loc.longitude,
        radius:"10",
        limit:"100"
      });

    const r=await fetch(
      "/api/properties?"+params
    );

    const data=await r.json();

    if(!r.ok)
      throw new Error(
        data.error||"Unable to load nearby properties."
      );

    return data.properties||[];
  }
};

})();
