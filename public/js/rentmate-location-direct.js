(function(){

  const LOCATION_KEY="rentmate_location";
  let requested=false;

  function toast(message){
    if(window.RentMatePremium?.toast){
      window.RentMatePremium.toast(message);
      return;
    }

    let t=document.querySelector(".rm-toast");

    if(!t){
      t=document.createElement("div");
      t.className="rm-toast";
      document.body.appendChild(t);
    }

    t.textContent=message;
    t.classList.add("show");

    clearTimeout(window.__rmDirectToast);

    window.__rmDirectToast=setTimeout(()=>{
      t.classList.remove("show");
    },2400);
  }

  function saveLocation(position){

    const data={
      latitude:position.coords.latitude,
      longitude:position.coords.longitude,
      accuracy:position.coords.accuracy,
      savedAt:Date.now()
    };

    localStorage.setItem(
      LOCATION_KEY,
      JSON.stringify(data)
    );

    document.documentElement.dataset.locationReady="true";

    toast("Location enabled. Finding nearby rentals…");

    /*
      Existing RentMate location system remains responsible
      for loading actual properties from the server.
    */

    window.dispatchEvent(
      new CustomEvent("rentmate:location-ready",{
        detail:data
      })
    );
  }

  function locationError(error){

    let message="Location access was not enabled.";

    if(error?.code===1){
      message="Location permission was not allowed.";
    }

    if(error?.code===2){
      message="Your location could not be detected.";
    }

    if(error?.code===3){
      message="Location request timed out. Please try again.";
    }

    toast(message);
  }

  function requestLocation(){

    if(requested) return;

    requested=true;

    if(!navigator.geolocation){
      toast("Location is not supported on this device/browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      saveLocation,
      locationError,
      {
        enableHighAccuracy:true,
        timeout:12000,
        maximumAge:300000
      }
    );
  }

  function hasLocation(){

    try{
      const data=JSON.parse(
        localStorage.getItem(LOCATION_KEY) || "null"
      );

      return !!(
        data &&
        Number.isFinite(Number(data.latitude)) &&
        Number.isFinite(Number(data.longitude))
      );

    }catch{
      return false;
    }
  }

  /*
    Direct permission request only after a real user action.
  */

  function attach(){

    document.addEventListener("click",(event)=>{

      const button=event.target.closest(
        '[data-location-action], .rm-use-location'
      );

      if(!button) return;

      event.preventDefault();

      requestLocation();
    });

  }

  /*
    If location was already granted previously,
    don't repeatedly ask the user.
  */

  function init(){

    if(hasLocation()){
      document.documentElement.dataset.locationReady="true";
    }

    attach();

  }

  window.RentMateDirectLocation={
    request:requestLocation,
    hasLocation
  };

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",init);
  }else{
    init();
  }

})();
