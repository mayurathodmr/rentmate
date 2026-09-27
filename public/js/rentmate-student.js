(function(){

  const API="/api";

  function qs(name){
    return document.querySelector(name);
  }

  function toast(msg){

    if(window.RentMatePremium?.toast){
      window.RentMatePremium.toast(msg);
      return;
    }

    alert(msg);
  }

  function escapeHtml(value){

    return String(value ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function addStudentSearch(){

    if(document.querySelector("#rmStudentSearch")) return;

    const host=
      document.querySelector("[data-property-search]") ||
      document.querySelector(".search-box") ||
      document.querySelector("main");

    if(!host) return;

    const box=document.createElement("section");

    box.id="rmStudentSearch";

    box.className="rm-student-search rm-glass";

    box.innerHTML=`
      <div class="rm-student-head">
        <div>
          <span class="rm-student-label">STUDENT RENTAL SEARCH</span>
          <h2>Find a place that fits you.</h2>
          <p>Search real listings by college, area, rent and facilities.</p>
        </div>
        <span class="rm-student-mark">🎓</span>
      </div>

      <div class="rm-student-grid">

        <label>
          <span>College / Area</span>
          <input
            id="rmCollege"
            type="text"
            placeholder="e.g. your college or locality">
        </label>

        <label>
          <span>Property</span>
          <select id="rmType">
            <option value="">Any type</option>
            <option value="Room">Room</option>
            <option value="1 RK">1 RK</option>
            <option value="Flat">Flat</option>
            <option value="Apartment">Apartment</option>
            <option value="PG">PG</option>
            <option value="Hostel">Hostel</option>
            <option value="House">House</option>
            <option value="Villa">Villa</option>
          </select>
        </label>

        <label>
          <span>Maximum rent</span>
          <input
            id="rmRent"
            type="number"
            min="0"
            placeholder="₹ Maximum">
        </label>

        <label>
          <span>BHK</span>
          <select id="rmBhk">
            <option value="">Any BHK</option>
            <option value="1 RK">1 RK</option>
            <option value="1 BHK">1 BHK</option>
            <option value="2 BHK">2 BHK</option>
            <option value="3 BHK">3 BHK</option>
            <option value="4 BHK">4 BHK</option>
          </select>
        </label>

      </div>

      <div class="rm-student-chips">

        <button type="button" data-amenity="">
          All
        </button>

        <button type="button" data-amenity="Wi-Fi">
          📶 Wi-Fi
        </button>

        <button type="button" data-amenity="Attached Bathroom">
          🚿 Attached Bath
        </button>

        <button type="button" data-amenity="Parking">
          🅿️ Parking
        </button>

        <button type="button" data-amenity="Furnished">
          🛋️ Furnished
        </button>

      </div>

      <div class="rm-student-actions">

        <button
          type="button"
          id="rmStudentSearchBtn"
          class="rm-premium-btn">
          Search Rentals
        </button>

        <button
          type="button"
          id="rmStudentNearBtn"
          class="rm-student-near">
          📍 Near Me
        </button>

      </div>
    `;

    host.prepend(box);

    let amenity="";

    box.querySelectorAll("[data-amenity]")
      .forEach(btn=>{

        btn.addEventListener("click",()=>{

          amenity=btn.dataset.amenity || "";

          box.querySelectorAll("[data-amenity]")
            .forEach(x=>x.classList.remove("active"));

          btn.classList.add("active");
        });

      });

    box.querySelector("[data-amenity]")
      ?.classList.add("active");


    qs("#rmStudentSearchBtn")
      ?.addEventListener("click",()=>{

        const params=new URLSearchParams();

        const college=qs("#rmCollege")?.value.trim();
        const type=qs("#rmType")?.value;
        const rent=qs("#rmRent")?.value;
        const bhk=qs("#rmBhk")?.value;

        if(college) params.set("college",college);
        if(type) params.set("type",type);
        if(rent) params.set("maxRent",rent);
        if(bhk) params.set("bhk",bhk);
        if(amenity) params.set("amenity",amenity);

        window.dispatchEvent(
          new CustomEvent(
            "rentmate:student-search",
            {detail:Object.fromEntries(params)}
          )
        );

        const target=
          document.querySelector("#properties") ||
          document.querySelector("#latest-properties") ||
          document.querySelector(".properties");

        target?.scrollIntoView({
          behavior:"smooth",
          block:"start"
        });

      });


    qs("#rmStudentNearBtn")
      ?.addEventListener("click",()=>{

        if(window.RentMateDirectLocation){
          window.RentMateDirectLocation.request();
        }else{
          toast("Location service is loading. Please try again.");
        }

      });

  }


  /*
    Expose API helper for existing property renderer.
  */

  window.RentMateStudent={

    async search(filters={}){

      const params=new URLSearchParams();

      Object.entries(filters).forEach(([key,value])=>{
        if(value!==undefined && value!==null && value!==""){
          params.set(key,value);
        }
      });

      params.set("limit","100");

      const response=await fetch(
        `${API}/properties?${params.toString()}`
      );

      if(!response.ok){
        throw new Error("Unable to load rentals");
      }

      return response.json();
    },

    async saveFavorite(propertyId){

      const token=localStorage.getItem("rentmate_token");

      if(!token){
        window.location.href=
          "/login.html?redirect="+
          encodeURIComponent(location.pathname);

        return;
      }

      const response=await fetch(
        `${API}/favorites/${encodeURIComponent(propertyId)}`,
        {
          method:"POST",
          headers:{
            Authorization:`Bearer ${token}`
          }
        }
      );

      const data=await response.json();

      if(!response.ok){
        throw new Error(
          data.error || "Could not save property"
        );
      }

      toast("Property saved");

      return data;
    },

    async removeFavorite(propertyId){

      const token=localStorage.getItem("rentmate_token");

      if(!token){
        return;
      }

      const response=await fetch(
        `${API}/favorites/${encodeURIComponent(propertyId)}`,
        {
          method:"DELETE",
          headers:{
            Authorization:`Bearer ${token}`
          }
        }
      );

      return response.json();
    },

    async enquire(propertyId,message){

      const token=localStorage.getItem("rentmate_token");

      if(!token){
        window.location.href=
          "/login.html?redirect="+
          encodeURIComponent(location.pathname);

        return;
      }

      const response=await fetch(
        `${API}/enquiries`,
        {
          method:"POST",
          headers:{
            "Content-Type":"application/json",
            Authorization:`Bearer ${token}`
          },
          body:JSON.stringify({
            property_id:propertyId,
            message
          })
        }
      );

      const data=await response.json();

      if(!response.ok){
        throw new Error(
          data.error || "Could not send enquiry"
        );
      }

      toast("Enquiry sent successfully");

      return data;
    }

  };


  function init(){

    addStudentSearch();

    /*
      Connect the search UI to any existing
      property-loading system without replacing it.
    */

    window.addEventListener(
      "rentmate:student-search",
      event=>{

        /*
          Existing homepage loader can listen to
          this event. We intentionally do not
          replace existing rendering here.
        */

        window.RentMateStudent.lastSearch=
          event.detail;

      }
    );

  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",init);
  }else{
    init();
  }

})();
