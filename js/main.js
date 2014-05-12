var mapHeight = $(window).height() - 90;
$("#map").height(mapHeight);
$("#infoWrapper").height(mapHeight);

// set global variables
var philippinesGeo = [];
var chapterData = [];
var regionList = [];
var displayedChapters = [];
var chapterMarkers;
var ambulanceData = [];

// define red cross map icon for chapter markers
var chapterIcon = L.icon({
  iconUrl: 'img/redcross.png',
  iconSize:     [12, 12], // size of the icon
  iconAnchor:   [6, 6], // point of the icon which will correspond to marker's location
  popupAnchor:  [0, -8] // point from which the popup should open relative to the iconAnchor
});
      
// initialize leaflet map
var map = L.map('map', {
    center: [11, 121],
    zoom: 4,
    attributionControl: false,
    doubleClickZoom: false,
    dragging: false,
    scrollWheelZoom: false,
    zoomControl: false

});

// global variables for leaflet map layers
var geojson = L.geoJson();
var chapterLayer = L.featureGroup();  

// add attribution to leaflet map
var attrib = new L.Control.Attribution({
    position: 'bottomleft'
});
var attribution = '&copy; <a href="http://www.redcross.org.ph/" title="Philippine Red Cross" target="_blank">Philippine Red Cross</a> 2014 | <a title="Disclaimer" onClick="showDisclaimer();">Disclaimer</a>';
attrib.addAttribution(attribution);
map.addControl(attrib);

// load country geometry data
function getWorld() {
    $.ajax({
        type: 'GET',
        url: 'data/PHL_ne_10m_admin0.geojson',
        contentType: 'application/json',
        dataType: 'json',
        timeout: 10000,        
        success: function(json) {
            philippinesGeo = json;
            mapCountry();
               
        },
        error: function(e) {
            console.log(e);
        }
    });
}

function mapCountry() {
  geojson = L.geoJson(philippinesGeo, {
    style: {
      fillColor: "#D7D7D8",
      weight: 2,
      opacity: 1,
      color: "#b0b0b2",
      fillOpacity: 1
    }
  }).addTo(map);   
  getAmbulanceData(); 
}

function getAmbulanceData() {
  $.ajax({
    type: 'GET',
    url: 'data/Chapters_Ambulances.json',
    contentType: 'application/json',
    dataType: 'json',
    timeout: 10000,
    success: function(data) {
      ambulanceData = data;
      getChapterData();
    },
    error: function(e) {
      console.log(e);
    }
  });
}

function getChapterData() {
  $.ajax({
    type: 'GET',
    url: 'data/PRC_chapters.json',
    contentType: 'application/json',
    dataType: 'json',
    timeout: 10000,
    success: function(data) {
      chapterData = data;
      createRegionsDropdown();
    },
    error: function(e) {
      console.log(e);
    }
  });
}

function createRegionsDropdown() {
    $.each(chapterData, function (index, chapter) {
        var thisRegion = chapter.properties.Region;    
        if ($.inArray(thisRegion, regionList) === -1){
          regionList.push(thisRegion);
        }
    });
    // sort so that the regions appear in alphabetical order in dropdown
    regionList = regionList.sort(); 
    // create item elements in dropdown list   
    for(var i = 0; i < regionList.length; i++) {
        var item = regionList[i];
        var listItemHtml = '<li><a href="#" onClick="regionSelect(' +"'"+ item +"'"+ '); return false;">' + item + "</li>"
        $('#dropdown-menu-regions').append(listItemHtml);       
    }
    regionSelect("All Regions");
}

function regionSelect(region) {
  $("#selectedRegion").html(region);
  $('#ambulanceInfo').empty();
  map.removeLayer(chapterLayer);
  chapterLayer = L.featureGroup(); 
  displayedChapters = [];
  $.each(chapterData, function(index, chapter){
    if(chapter.properties.Region === region || region === "All Regions"){
      displayedChapters.push(chapter);
    }
  });
  $.each(displayedChapters, function(index, chapter){
    var thisMarker = L.geoJson(chapter, {
      pointToLayer: function (feature, latlng) {
        return L.marker(latlng,{icon: chapterIcon});   
      },  
      onEachFeature: onEachChapter         
    });
    chapterLayer.addLayer(thisMarker);
  });
  chapterLayer.addTo(map);

  var markersBounds = chapterLayer.getBounds();
  map.fitBounds(markersBounds);
  // recreate chapter dropdown menu with only displayed chapters
  createChaptersDropdowns(); 
};

function createChaptersDropdowns(region) {
  var chapterNamesList = [];
  $('#dropdown-menu-chapters').empty();
  $.each(displayedChapters, function (index, chapter) {
      chapterNamesList.push(chapter.properties.Chapter);    
  });
  // sort so that the chapters appear in alphabetical order in dropdown
  chapterNamesList = chapterNamesList.sort(); 
  // create item elements in dropdown list   
  for(var i = 0; i < chapterNamesList.length; i++) {
      var item = chapterNamesList[i];
      var listItemHtml = '<li><a href="#" onClick="chapterSelect(' +"'"+ item +"'"+ '); return false;">' + item + "</li>"
      $('#dropdown-menu-chapters').append(listItemHtml);       
  }
}

function chapterSelect(chapter) {
  $('#ambulanceInfo').empty();
  // find all ambulances in data for the selected chapter
  var selectedChapterAmbulances = [];
  $.each(ambulanceData, function (index, ambulance){
    if(chapter === ambulance.Chapter_Lookup){
      selectedChapterAmbulances.push(ambulance);
    }
  });
  // if no ambulances are found in the data, tell the user
  if(selectedChapterAmbulances.length === 0){
    $('#ambulanceInfo').append(chapter + ". No ambulance at this location.");
  } else {
    // if there are ambulances, display the data for each in the info side bar 
    $('#ambulanceInfo').append("<h4>" + chapter + "</h4>");
    for(var i = 0; i < selectedChapterAmbulances.length; i++) {
      var item = selectedChapterAmbulances[i];
      var ambulanceHtml = '<div><img class="ambulanceIcon" src="img/ambulance_OCHAremix.png" />' +
        selectedChapterAmbulances[i].BRAND + " | " + selectedChapterAmbulances[i].Plate_no + " | " +
        selectedChapterAmbulances[i].STATUS + "</div>";
      $('#ambulanceInfo').append(ambulanceHtml);
    }
  }
}

// define events attached to each marker
function onEachChapter(feature, layer){
  layer.bindPopup(feature.properties.Chapter);
  layer.on('click', function(e) {
    markerClick(e);
  });
}

// on marker click display ambulance data for that chapter
function markerClick(e){
  var clickTarget = e.target;
  chapterSelect(clickTarget.feature.properties.Chapter);
}

// show disclaimer text on click of dislcaimer link
function showDisclaimer() {
    window.alert("The maps on this page do not imply the expression of any opinion on the part of the Philippine Red Cross concerning the legal status of a territory or of its authorities. Boundary data from GADM.");
}

// start function chain for page build
getWorld();