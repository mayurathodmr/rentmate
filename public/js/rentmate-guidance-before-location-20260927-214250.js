(function(){

  const STORAGE_KEY="rentmate_guidance_seen_v1";

  const steps=[
    {
      icon:"👋",
      title:"Welcome to RentMate",
      text:"Find real rooms, PGs, flats and rental properties around you — simply and quickly."
    },
    {
      icon:"📍",
      title:"Find Places Near You",
      text:"Allow location access to discover real rental properties available around your current location."
    },
    {
      icon:"🔎",
      title:"Search Your Way",
      text:"Search by area, property type, BHK and rent to quickly find a place that matches your needs."
    },
    {
      icon:"❤️",
      title:"Save What You Like",
      text:"Save your favourite properties and come back to them whenever you want."
    },
    {
      icon:"🏠",
      title:"Ready to Find Your Place?",
      text:"Explore verified listings, check real property details and send an enquiry directly to the owner."
    }
  ];

  let current=0;

  function alreadySeen(){
    try{
      return localStorage.getItem(STORAGE_KEY)==="1";
    }catch{
      return false;
    }
  }

  function markSeen(){
    try{
      localStorage.setItem(STORAGE_KEY,"1");
    }catch{}
  }

  function create(){

    if(alreadySeen()) return;

    const overlay=document.createElement("div");
    overlay.className="rm-guide-overlay";

    overlay.innerHTML=`
      <div class="rm-guide-card" role="dialog" aria-modal="true">

        <div class="rm-guide-glow"></div>

        <button
          class="rm-guide-skip"
          type="button"
          aria-label="Skip introduction">
          Skip
        </button>

        <div class="rm-guide-content">

          <div class="rm-guide-icon" id="rmGuideIcon">
            👋
          </div>

          <h2 class="rm-guide-title" id="rmGuideTitle">
            Welcome to RentMate
          </h2>

          <p class="rm-guide-text" id="rmGuideText">
            Find real rooms, PGs, flats and rental properties around you — simply and quickly.
          </p>

          <div
            class="rm-guide-progress"
            id="rmGuideProgress">
          </div>

          <div class="rm-guide-actions">

            <button
              class="rm-guide-btn rm-guide-back"
              id="rmGuideBack"
              type="button">
              Back
            </button>

            <button
              class="rm-guide-btn rm-guide-next"
              id="rmGuideNext"
              type="button">
              Next
            </button>

          </div>

          <div class="rm-guide-note">
            A quick introduction to RentMate
          </div>

        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const card=overlay.querySelector(".rm-guide-card");
    const icon=overlay.querySelector("#rmGuideIcon");
    const title=overlay.querySelector("#rmGuideTitle");
    const text=overlay.querySelector("#rmGuideText");
    const progress=overlay.querySelector("#rmGuideProgress");
    const back=overlay.querySelector("#rmGuideBack");
    const next=overlay.querySelector("#rmGuideNext");
    const skip=overlay.querySelector(".rm-guide-skip");

    function render(direction="next"){

      const step=steps[current];

      card.classList.remove("slide-next","slide-back");

      void card.offsetWidth;

      card.classList.add(
        direction==="back"
          ? "slide-back"
          : "slide-next"
      );

      icon.textContent=step.icon;
      title.textContent=step.title;
      text.textContent=step.text;

      progress.innerHTML=steps.map((_,i)=>`
        <span class="rm-guide-dot ${i===current?"active":""}"></span>
      `).join("");

      back.style.visibility=current===0
        ? "hidden"
        : "visible";

      next.textContent=
        current===steps.length-1
          ? "Get Started"
          : "Next";
    }

    function close(){
      markSeen();
      overlay.classList.remove("show");

      setTimeout(()=>{
        overlay.remove();
      },380);
    }

    back.addEventListener("click",()=>{
      if(current>0){
        current--;
        render("back");
      }
    });

    next.addEventListener("click",()=>{
      if(current<steps.length-1){
        current++;
        render("next");
      }else{
        close();
      }
    });

    skip.addEventListener("click",close);

    overlay.addEventListener("click",(e)=>{
      if(e.target===overlay){
        close();
      }
    });

    document.addEventListener("keydown",function keyHandler(e){

      if(!document.body.contains(overlay)) return;

      if(e.key==="Escape"){
        close();
        document.removeEventListener("keydown",keyHandler);
      }

      if(e.key==="ArrowRight"){
        next.click();
      }

      if(e.key==="ArrowLeft"){
        back.click();
      }
    });

    render();

    requestAnimationFrame(()=>{
      overlay.classList.add("show");
    });
  }

  /*
    Small API so Settings/Admin can optionally
    allow the user to see the introduction again.
  */
  window.RentMateGuidance={
    show:function(){
      try{
        localStorage.removeItem(STORAGE_KEY);
      }catch{}

      document.querySelector(".rm-guide-overlay")?.remove();

      create();
    },

    reset:function(){
      try{
        localStorage.removeItem(STORAGE_KEY);
      }catch{}
    }
  };

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",create);
  }else{
    create();
  }

})();
