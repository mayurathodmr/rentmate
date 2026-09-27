(function(){

  const token=localStorage.getItem("rentmate_token");

  window.RentMateFinal={

    token,

    async api(url,options={}){
      const headers={
        ...(options.headers||{})
      };

      if(token){
        headers.Authorization="Bearer "+token;
      }

      if(
        options.body &&
        !(options.body instanceof FormData) &&
        !headers["Content-Type"]
      ){
        headers["Content-Type"]="application/json";
      }

      const r=await fetch(url,{
        ...options,
        headers
      });

      let data={};

      try{
        data=await r.json();
      }catch{}

      if(!r.ok){
        throw new Error(
          data.error || "Request failed"
        );
      }

      return data;
    },

    money(value){
      return "₹"+Number(value||0).toLocaleString("en-IN");
    },

    escape(value){
      return String(value??"")
        .replaceAll("&","&amp;")
        .replaceAll("<","&lt;")
        .replaceAll(">","&gt;")
        .replaceAll('"',"&quot;")
        .replaceAll("'","&#039;");
    },

    logout(){
      localStorage.removeItem("rentmate_token");
      localStorage.removeItem("rentmate_user");
      location.href="/login.html";
    }
  };

})();
