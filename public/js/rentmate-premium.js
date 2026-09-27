(function(){

  const FAV_KEY = "rentmate_favorites";
  const THEME_KEY = "rentmate_theme";

  function getFavs(){
    try{
      return JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
    }catch{
      return [];
    }
  }

  function saveFavs(arr){
    localStorage.setItem(FAV_KEY,JSON.stringify(arr));
  }

  function toast(message){
    let el=document.querySelector(".rm-toast");

    if(!el){
      el=document.createElement("div");
      el.className="rm-toast";
      document.body.appendChild(el);
    }

    el.textContent=message;
    el.classList.add("show");

    clearTimeout(window.__rmToastTimer);

    window.__rmToastTimer=setTimeout(()=>{
      el.classList.remove("show");
    },2200);
  }

  window.RentMatePremium={
    toast,

    toggleFavorite(id,button){

      if(!id) return;

      let favs=getFavs();

      if(favs.includes(String(id))){
        favs=favs.filter(x=>x!==String(id));
        button?.classList.remove("active");
        if(button) button.textContent="♡";
        toast("Removed from saved");
      }else{
        favs.push(String(id));
        button?.classList.add("active");
        if(button) button.textContent="♥";
        toast("Saved to your favourites");
      }

      saveFavs(favs);
    }
  };

  /* ----------------------------------
     Theme
  ---------------------------------- */

  function applyTheme(){
    const theme=localStorage.getItem(THEME_KEY);

    if(theme==="dark"){
      document.documentElement.classList.add("rm-dark");
    }else{
      document.documentElement.classList.remove("rm-dark");
    }
  }

  function toggleTheme(){
    const dark=document.documentElement.classList.toggle("rm-dark");

    localStorage.setItem(
      THEME_KEY,
      dark ? "dark" : "light"
    );

    toast(dark ? "Dark mode enabled" : "Light mode enabled");
  }

  applyTheme();

  /* ----------------------------------
     Reveal animation
  ---------------------------------- */

  function setupReveal(){

    const elements=document.querySelectorAll(
      "section, .card, .property-card, .rm-property-card, .category, .feature, [data-reveal]"
    );

    if(!("IntersectionObserver" in window)){
      elements.forEach(e=>e.classList.add("rm-visible"));
      return;
    }

    elements.forEach(e=>{
      e.classList.add("rm-reveal");
    });

    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          entry.target.classList.add("rm-visible");
          observer.unobserve(entry.target);
        }
      });
    },{
      threshold:.08
    });

    elements.forEach(e=>observer.observe(e));
  }

  /* ----------------------------------
     Bottom navigation
  ---------------------------------- */

  function addBottomNav(){

    if(document.querySelector(".rm-mobile-nav")) return;
    if(document.querySelector(".rm-bottom-nav")) return;

    const nav=document.createElement("nav");
    nav.className="rm-bottom-nav";

    const path=location.pathname;

    const homeActive =
      path==="/" ||
      path.includes("index.html");

    nav.innerHTML=`
      <a href="/" class="${homeActive?"active":""}">
        <span class="rm-nav-icon">⌂</span>
        <span>Home</span>
      </a>

      <a href="/user/dashboard.html">
        <span class="rm-nav-icon">⌕</span>
        <span>Find</span>
      </a>

      <a href="/user/dashboard.html#saved">
        <span class="rm-nav-icon">♡</span>
        <span>Saved</span>
      </a>

      <button type="button" id="rmThemeBtn">
        <span class="rm-nav-icon">☾</span>
        <span>Theme</span>
      </button>

      <a href="/login.html">
        <span class="rm-nav-icon">◯</span>
        <span>Account</span>
      </a>
    `;

    document.body.appendChild(nav);

    document
      .getElementById("rmThemeBtn")
      ?.addEventListener("click",toggleTheme);
  }

  /* ----------------------------------
     Existing property cards
     Add real favourite buttons
  ---------------------------------- */

  function enhanceCards(){

    const cards=document.querySelectorAll(
      ".property-card, .rm-property-card, [data-property-id]"
    );

    const favs=getFavs();

    cards.forEach(card=>{

      const id=
        card.dataset.propertyId ||
        card.getAttribute("data-id") ||
        card.dataset.id;

      if(!id) return;

      if(card.querySelector(".rm-fav")) return;

      const button=document.createElement("button");

      button.className="rm-fav";
      button.type="button";

      const saved=favs.includes(String(id));

      if(saved){
        button.classList.add("active");
        button.textContent="♥";
      }else{
        button.textContent="♡";
      }

      button.setAttribute(
        "aria-label",
        saved ? "Remove from favourites" : "Save property"
      );

      button.addEventListener("click",(event)=>{
        event.preventDefault();
        event.stopPropagation();

        RentMatePremium.toggleFavorite(id,button);
      });

      card.style.position="relative";
      card.appendChild(button);
    });
  }

  /* ----------------------------------
     Location button polish
  ---------------------------------- */

  function enhanceLocationButtons(){

    document.querySelectorAll(
      'button, a'
    ).forEach(el=>{

      const text=(el.textContent || "").toLowerCase();

      if(
        text.includes("use my location") ||
        text.includes("allow location") ||
        text.includes("current location")
      ){
        el.classList.add("rm-location-pulse");
      }

    });
  }

  /* ----------------------------------
     Online/offline feedback
  ---------------------------------- */

  function connectionState(){

    window.addEventListener("offline",()=>{
      toast("You're offline. Showing saved app data where available.");
    });

    window.addEventListener("online",()=>{
      toast("You're back online.");
    });
  }

  /* ----------------------------------
     Init
  ---------------------------------- */

  function init(){

    setupReveal();
    addBottomNav();
    enhanceCards();
    enhanceLocationButtons();
    connectionState();

    /*
      Property cards may be rendered later
      by fetch/API, so observe DOM changes.
    */

    const observer=new MutationObserver(()=>{
      enhanceCards();
    });

    observer.observe(document.body,{
      childList:true,
      subtree:true
    });
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",init);
  }else{
    init();
  }

})();
