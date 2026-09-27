/*
  RENTMATE REAL LOCATION + NEARBY ALERT SYSTEM
  ---------------------------------------------
  Uses:
  - Browser Geolocation API
  - Browser Notification API
  - localStorage
  - Real API listings
*/

(function(){

  const RM_LOCATION_KEY = "rentmate_location";
  const RM_NOTIFY_KEY = "rentmate_notifications";
  const RM_RADIUS = 10; // km

  let currentLocation = null;
  let knownPropertyIds = new Set();
  let watchId = null;
  let refreshTimer = null;

  function $(id){
    return document.getElementById(id);
  }

  function escapeHtml(value){
    return String(value ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function saveLocation(position){

    currentLocation = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      updatedAt: Date.now()
    };

    localStorage.setItem(
      RM_LOCATION_KEY,
      JSON.stringify(currentLocation)
    );

    window.dispatchEvent(
      new CustomEvent("rentmate:location",{
        detail:currentLocation
      })
    );

    showLocationStatus(
      "📍 Location detected",
      "Nearby rental properties can now be shown."
    );

    loadNearbyProperties();
  }

  function locationError(error){

    let title = "Location unavailable";
    let message = "Nearby property detection is unavailable.";

    if(error.code === 1){
      title = "📍 Location permission blocked";
      message =
        "Allow location permission in your browser settings to find nearby rentals.";
    }

    if(error.code === 2){
      title = "📍 Location unavailable";
      message =
        "Your device could not determine the current location.";
    }

    if(error.code === 3){
      title = "📍 Location timeout";
      message =
        "Location detection took too long. Please try again.";
    }

    showLocationStatus(title,message);
  }

  function requestLocation(){

    if(!navigator.geolocation){

      showLocationStatus(
        "Location not supported",
        "This browser does not support location services."
      );

      return;
    }

    showLocationStatus(
      "📍 Requesting location...",
      "Please choose Allow when your browser asks for location access."
    );

    navigator.geolocation.getCurrentPosition(
      saveLocation,
      locationError,
      {
        enableHighAccuracy:true,
        timeout:15000,
        maximumAge:30000
      }
    );
  }

  function startLocationWatch(){

    if(!navigator.geolocation) return;

    if(watchId !== null){
      navigator.geolocation.clearWatch(watchId);
    }

    watchId =
      navigator.geolocation.watchPosition(
        saveLocation,
        locationError,
        {
          enableHighAccuracy:true,
          timeout:20000,
          maximumAge:60000
        }
      );
  }

  async function requestNotifications(){

    if(!("Notification" in window)){

      showNotificationStatus(
        "Notifications not supported",
        "Your browser does not support web notifications."
      );

      return;
    }

    if(Notification.permission === "granted"){

      showNotificationStatus(
        "🔔 Notifications enabled",
        "RentMate can notify you about nearby new listings."
      );

      return;
    }

    if(Notification.permission === "denied"){

      showNotificationStatus(
        "🔕 Notifications blocked",
        "Enable notifications from browser site settings."
      );

      return;
    }

    try{

      const permission =
        await Notification.requestPermission();

      if(permission === "granted"){

        localStorage.setItem(
          RM_NOTIFY_KEY,
          "granted"
        );

        showNotificationStatus(
          "🔔 Notifications enabled",
          "You will receive nearby listing alerts while supported by your browser."
        );

      }else{

        showNotificationStatus(
          "🔕 Notifications not enabled",
          "You can enable them later from browser site settings."
        );
      }

    }catch(err){

      console.error(err);

    }
  }

  function showBrowserNotification(property){

    if(
      !("Notification" in window) ||
      Notification.permission !== "granted"
    ){
      return;
    }

    const title =
      property.title ||
      "New rental property nearby";

    const rent =
      property.rent
        ? "₹" +
          Number(property.rent).toLocaleString("en-IN") +
          "/month"
        : "Rent available";

    try{

      const notification =
        new Notification(
          "🏠 RentMate — Nearby Property",
          {
            body:title + "\n" + rent,
            tag:"rentmate-property-"+property.id
          }
        );

      notification.onclick = function(){

        window.focus();

        if(property.id){

          window.location.href =
            "/property.html?id="+
            encodeURIComponent(property.id);
        }

      };

    }catch(err){

      console.error(err);

    }
  }

  function distanceKm(lat1,lon1,lat2,lon2){

    const R = 6371;

    const dLat =
      (lat2-lat1) * Math.PI / 180;

    const dLon =
      (lon2-lon1) * Math.PI / 180;

    const a =
      Math.sin(dLat/2) ** 2 +
      Math.cos(lat1*Math.PI/180) *
      Math.cos(lat2*Math.PI/180) *
      Math.sin(dLon/2) ** 2;

    return R * 2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1-a)
      );
  }

  function propertyCoordinates(property){

    const lat =
      Number(
        property.latitude ??
        property.lat
      );

    const lng =
      Number(
        property.longitude ??
        property.lng ??
        property.lon
      );

    if(
      Number.isFinite(lat) &&
      Number.isFinite(lng)
    ){
      return {lat,lng};
    }

    return null;
  }

  function isNearby(property){

    if(!currentLocation){
      return false;
    }

    const coords =
      propertyCoordinates(property);

    if(!coords){
      return false;
    }

    const distance =
      distanceKm(
        currentLocation.latitude,
        currentLocation.longitude,
        coords.lat,
        coords.lng
      );

    property._distanceKm = distance;

    return distance <= RM_RADIUS;
  }

  async function loadNearbyProperties(){

    if(!currentLocation){
      return;
    }

    try{

      const url =
        "/api/properties" +
        "?limit=100" +
        "&latitude=" +
        encodeURIComponent(currentLocation.latitude) +
        "&longitude=" +
        encodeURIComponent(currentLocation.longitude) +
        "&radius=" +
        RM_RADIUS;

      const response =
        await fetch(url,{
          cache:"no-store"
        });

      if(!response.ok) return;

      const data =
        await response.json();

      const properties =
        Array.isArray(data.properties)
          ? data.properties
          : Array.isArray(data.data)
            ? data.data
            : [];

      const nearby =
        properties.filter(isNearby);

      renderNearby(nearby);

      for(const property of nearby){

        if(!property.id) continue;

        if(!knownPropertyIds.has(String(property.id))){

          const firstRun =
            knownPropertyIds.size === 0;

          knownPropertyIds.add(
            String(property.id)
          );

          /*
            Do not notify for everything already
            existing on the first load.
          */
          if(!firstRun){

            showBrowserNotification(property);

            showToast(
              "🏠 New nearby rental",
              property.title ||
              "A new property is available near you."
            );
          }
        }
      }

    }catch(err){

      console.error(
        "RentMate nearby loading error:",
        err
      );
    }
  }

  function renderNearby(properties){

    const container =
      $("rentmate-nearby-list");

    if(!container) return;

    if(!properties.length){

      container.innerHTML = `
        <div class="rm-empty">
          <div class="rm-empty-icon">🏠</div>
          <b>No nearby listings found</b>
          <span>
            New properties will appear here when real
            approved listings are available nearby.
          </span>
        </div>
      `;

      return;
    }

    container.innerHTML =
      properties
      .sort(
        (a,b)=>
          (a._distanceKm || 999) -
          (b._distanceKm || 999)
      )
      .slice(0,10)
      .map(property => {

        const rent =
          property.rent
            ? "₹"+
              Number(property.rent)
              .toLocaleString("en-IN")+
              "/month"
            : "Rent not specified";

        const distance =
          property._distanceKm !== undefined
            ? property._distanceKm.toFixed(1)+" km away"
            : "Nearby";

        return `
          <article
            class="rm-nearby-card"
            onclick="window.location.href='/property.html?id=${encodeURIComponent(property.id)}'"
          >

            <div class="rm-nearby-icon">🏠</div>

            <div class="rm-nearby-info">

              <b>
                ${escapeHtml(
                  property.title ||
                  "Rental Property"
                )}
              </b>

              <span>
                ${escapeHtml(
                  property.area ||
                  property.locality ||
                  property.city ||
                  "Nearby"
                )}
              </span>

              <strong>${rent}</strong>

              <small>📍 ${distance}</small>

            </div>

            <div class="rm-arrow">›</div>

          </article>
        `;

      })
      .join("");
  }

  function showLocationStatus(title,message){

    const box =
      $("rentmate-location-status");

    if(!box) return;

    box.innerHTML = `
      <div class="rm-status-icon">📍</div>
      <div>
        <b>${escapeHtml(title)}</b>
        <span>${escapeHtml(message)}</span>
      </div>
    `;

    box.classList.add("show");
  }

  function showNotificationStatus(title,message){

    const box =
      $("rentmate-notification-status");

    if(!box) return;

    box.innerHTML = `
      <div class="rm-status-icon">🔔</div>
      <div>
        <b>${escapeHtml(title)}</b>
        <span>${escapeHtml(message)}</span>
      </div>
    `;

    box.classList.add("show");
  }

  function showToast(title,message){

    let toast =
      $("rentmate-toast");

    if(!toast){

      toast =
        document.createElement("div");

      toast.id =
        "rentmate-toast";

      toast.className =
        "rm-toast";

      document.body.appendChild(toast);
    }

    toast.innerHTML = `
      <div class="rm-toast-icon">🏠</div>
      <div>
        <b>${escapeHtml(title)}</b>
        <span>${escapeHtml(message)}</span>
      </div>
    `;

    toast.classList.add("show");

    clearTimeout(
      toast._timer
    );

    toast._timer =
      setTimeout(
        ()=>toast.classList.remove("show"),
        7000
      );
  }

  function injectUI(){

    if($("rentmate-permission-panel")){
      return;
    }

    const panel =
      document.createElement("section");

    panel.id =
      "rentmate-permission-panel";

    panel.className =
      "rm-permission-panel";

    panel.innerHTML = `

      <div class="rm-panel-head">

        <div>
          <div class="rm-eyebrow">
            SMART RENTAL DISCOVERY
          </div>

          <h2>
            Find rentals around you
          </h2>

          <p>
            Allow location and notifications to receive
            genuine nearby property alerts.
          </p>
        </div>

        <div class="rm-live-dot">
          <i></i> LIVE
        </div>

      </div>

      <div class="rm-permission-actions">

        <button
          class="rm-permission-btn primary"
          id="rm-location-btn"
        >
          <span>📍</span>
          Allow Location
        </button>

        <button
          class="rm-permission-btn"
          id="rm-notification-btn"
        >
          <span>🔔</span>
          Enable Alerts
        </button>

      </div>

      <div
        id="rentmate-location-status"
        class="rm-status-box"
      ></div>

      <div
        id="rentmate-notification-status"
        class="rm-status-box"
      ></div>

      <div class="rm-nearby-head">
        <div>
          <b>Nearby properties</b>
          <span>Within ${RM_RADIUS} km</span>
        </div>

        <span class="rm-live-label">
          ● Auto refresh
        </span>
      </div>

      <div
        id="rentmate-nearby-list"
        class="rm-nearby-list"
      >
        <div class="rm-empty">
          <div class="rm-empty-icon">📍</div>
          <b>Location permission needed</b>
          <span>
            Allow location to discover genuine nearby rentals.
          </span>
        </div>
      </div>

    `;

    const target =
      document.querySelector("main") ||
      document.body;

    target.prepend(panel);

    $("rm-location-btn")
      .addEventListener(
        "click",
        requestLocation
      );

    $("rm-notification-btn")
      .addEventListener(
        "click",
        requestNotifications
      );
  }

  function restoreSavedLocation(){

    try{

      const saved =
        localStorage.getItem(
          RM_LOCATION_KEY
        );

      if(!saved) return;

      const parsed =
        JSON.parse(saved);

      if(
        parsed &&
        Number.isFinite(parsed.latitude) &&
        Number.isFinite(parsed.longitude)
      ){

        currentLocation = parsed;

        showLocationStatus(
          "📍 Saved location available",
          "Checking nearby rental listings..."
        );

        loadNearbyProperties();

      }

    }catch(err){

      console.error(err);

    }
  }

  function startRealtimeRefresh(){

    if(refreshTimer){
      clearInterval(refreshTimer);
    }

    /*
      Real API polling while the website is open.
      This does NOT claim background push support.
    */

    refreshTimer =
      setInterval(
        loadNearbyProperties,
        30000
      );
  }

  function init(){

    injectUI();

    restoreSavedLocation();

    startLocationWatch();

    startRealtimeRefresh();

    /*
      Ask only when user interacts with the
      permission buttons. No forced permission popup.
    */
  }

  window.RentMateLocation = {
    requestLocation,
    requestNotifications,
    loadNearbyProperties
  };

  if(document.readyState === "loading"){

    document.addEventListener(
      "DOMContentLoaded",
      init
    );

  }else{

    init();

  }

})();
