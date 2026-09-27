(function(){

  const STORAGE_KEY="rentmate_guidance_seen_v2";

  const steps=[
    {
      icon:"👋",
      title:"Welcome to RentMate",
      text:"Find real rooms, PGs, flats and rental properties in one simple place."
    },
    {
      icon:"📍",
      title:"Allow Location Access",
      text:"Allow location access to see rental properties available near you."
    },
    {
      icon:"🔎",
      title:"Find Your Place",
      text:"Search by area, rent, BHK or property type and explore real listings."
    },
    {
      icon:"❤️",
      title:"Save Your Favourites",
      text:"Save properties you like and easily find them again later."
    }
  ];

  let current=0;

  function seen(){
    return localStorage.getItem(STORAGE_KEY)==="1";
  }

  function markSeen(){
    localStorage.setItem(STORAGE_KEY,"1");
  }

  function create(){

    if(seen()) return;

    const overlay=document.createElement("div");

    overlay.className="rm-guide-overlay";

    overlay.innerHTML=`
      <div class="rm-guide-card" role="dialog" aria-modal="true">

        <div class="rm-guide-glow"></div>

        <button
          class="rm-guide-skip"
          type="button">
          Skip
        </button>

        <div class="rm-guide-content">

          <div class="rm-guide-icon" id="rmGuideIcon"></div>

          <h2
            class="rm-guide-title"
            id="rmGuideTitle">
          </h2>

          <p
            class="rm-guide-text"
            id="rmGuideText">
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

      back.style.visibility=
        current===0 ? "hidden" : "visible";

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

    back.onclick=()=>{
      if(current>0){
        current--;
        render("back");
      }
    };

    next.onclick=()=>{
      if(current<steps.length-1){
        current++;
        render("next");
      }else{
        close();
      }
    };

    skip.onclick=close;

    overlay.onclick=(e)=>{
      if(e.target===overlay){
        close();
      }
    };

    render();

    requestAnimationFrame(()=>{
      overlay.classList.add("show");
    });
  }

  window.RentMateGuidance={
    show:function(){
      localStorage.removeItem(STORAGE_KEY);
      document.querySelector(".rm-guide-overlay")?.remove();
      create();
    },
    reset:function(){
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",create);
  }else{
    create();
  }

})();
