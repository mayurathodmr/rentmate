(function(){

  const THEME="rentmate_theme";

  function toast(message){

    let el=document.querySelector(".rm-app-toast");

    if(!el){

      el=document.createElement("div");

      el.className="rm-app-toast";

      Object.assign(el.style,{
        position:"fixed",
        left:"50%",
        bottom:"88px",
        transform:"translate(-50%,20px)",
        opacity:"0",
        zIndex:"99999",
        padding:"12px 16px",
        borderRadius:"15px",
        background:"rgba(16,24,40,.94)",
        color:"#fff",
        fontSize:"13px",
        fontWeight:"700",
        transition:".25s ease",
        pointerEvents:"none",
        whiteSpace:"nowrap",
        maxWidth:"calc(100vw - 30px)",
        overflow:"hidden",
        textOverflow:"ellipsis"
      });

      document.body.appendChild(el);
    }

    el.textContent=message;
    el.style.opacity="1";
    el.style.transform="translate(-50%,0)";

    clearTimeout(window.__rmAppToast);

    window.__rmAppToast=setTimeout(()=>{
      el.style.opacity="0";
      el.style.transform="translate(-50%,20px)";
    },2200);
  }


  function applyTheme(){

    if(localStorage.getItem(THEME)==="dark"){
      document.documentElement.classList.add("rm-dark");
    }else{
      document.documentElement.classList.remove("rm-dark");
    }

  }


  function toggleTheme(){

    const dark=
      document.documentElement.classList.toggle("rm-dark");

    localStorage.setItem(
      THEME,
      dark ? "dark" : "light"
    );

    toast(
      dark
        ? "Dark mode enabled"
        : "Light mode enabled"
    );
  }


  function addHeader(){

    if(document.querySelector(".rm-app-header")) return;

    const header=document.createElement("header");

    header.className="rm-app-header";

    header.innerHTML=`
      <div class="rm-header-inner">

        <a href="/" class="rm-brand">

          <span class="rm-brand-mark">
            🏠
          </span>

          <span class="rm-brand-text">
            RentMate
          </span>

        </a>

        <div class="rm-header-actions">

          <button
            class="rm-header-btn optional"
            id="rmThemeTop"
            type="button">
            ☾ Theme
          </button>

          <a
            class="rm-header-btn"
            href="/login.html">
            Account
          </a>

        </div>

      </div>
    `;

    document.body.prepend(header);

    document
      .querySelector("#rmThemeTop")
      ?.addEventListener("click",toggleTheme);
  }


  function addMobileNav(){

    if(document.querySelector(".rm-mobile-nav")) return;

    const path=location.pathname;

    const home=
      path==="/" ||
      path.includes("index.html");

    const saved=
      path.includes("saved") ||
      location.hash==="#saved";

    const nav=document.createElement("nav");

    nav.className="rm-mobile-nav";

    nav.innerHTML=`
      <a
        href="/"
        class="${home?"active":""}">
        <span class="icon">⌂</span>
        <span>Home</span>
      </a>

      <a href="/user/dashboard.html">
        <span class="icon">⌕</span>
        <span>Search</span>
      </a>

      <a
        href="/user/dashboard.html#saved"
        class="${saved?"active":""}">
        <span class="icon">♡</span>
        <span>Saved</span>
      </a>

      <button
        id="rmThemeBottom"
        type="button">
        <span class="icon">☾</span>
        <span>Theme</span>
      </button>

      <a href="/login.html">
        <span class="icon">◯</span>
        <span>Account</span>
      </a>
    `;

    document.body.appendChild(nav);

    document
      .querySelector("#rmThemeBottom")
      ?.addEventListener("click",toggleTheme);
  }


  function smoothReveal(){

    const items=document.querySelectorAll(
      ".rm-section,.rm-property-card,.rm-category,.rm-trust-card"
    );

    if(!("IntersectionObserver" in window)){
      return;
    }

    items.forEach(item=>{
      item.style.opacity="0";
      item.style.transform="translateY(14px)";
      item.style.transition=
        "opacity .55s ease,transform .55s ease";
    });

    const observer=new IntersectionObserver(entries=>{

      entries.forEach(entry=>{

        if(entry.isIntersecting){

          entry.target.style.opacity="1";
          entry.target.style.transform="none";

          observer.unobserve(entry.target);
        }

      });

    },{
      threshold:.08
    });

    items.forEach(item=>observer.observe(item));
  }


  function protectExternalDemoContent(){

    /*
      We do not inject properties, reviews, users,
      prices or analytics. Real API data remains
      the only source for rental listings.
    */
  }


  function init(){

    applyTheme();
    addHeader();
    addMobileNav();

    setTimeout(()=>{
      smoothReveal();
      protectExternalDemoContent();
    },50);
  }


  window.RentMateApp={
    toast,
    toggleTheme
  };


  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",init);
  }else{
    init();
  }

})();
