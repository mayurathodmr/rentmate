(function(){

"use strict";

window.RentMateMap={

  async load(containerId,latitude,longitude){

    if(
      typeof L==="undefined" ||
      !latitude ||
      !longitude
    ){
      return null;
    }

    const map=
      L.map(containerId)
       .setView(
         [latitude,longitude],
         15
       );

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom:19,
        attribution:"© OpenStreetMap contributors"
      }
    ).addTo(map);

    L.marker(
      [latitude,longitude]
    )
    .addTo(map)
    .bindPopup(
      "Property location"
    )
    .openPopup();

    return map;
  }

};

})();
