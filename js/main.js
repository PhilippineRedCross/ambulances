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
var ambulanceLocations = [];
var markersBounds = [];

// define map icons
var nhqFocusIcon = L.icon({
  iconUrl: 'img/nhq_focus.png',
  iconSize:     [20, 29], // size of the icon
  iconAnchor:   [10, 19], // point of the icon which will correspond to marker's location
  popupAnchor:  [0, -21] // point from which the popup should open relative to the iconAnchor
});
var nhqDimIcon = L.icon({
  iconUrl: 'img/nhq_dim.png',
  iconSize:     [20, 29], // size of the icon
  iconAnchor:   [10, 19], // point of the icon which will correspond to marker's location
  popupAnchor:  [0, -21] // point from which the popup should open relative to the iconAnchor
});
var chapterFocusIcon = L.icon({
  iconUrl: 'img/chapter_focus.png',
  iconSize:     [20, 20], // size of the icon
  iconAnchor:   [10, 10], // point of the icon which will correspond to marker's location
  popupAnchor:  [0, -12] // point from which the popup should open relative to the iconAnchor
});
var chapterDimIcon = L.icon({
  iconUrl: 'img/chapter_dim.png',
  iconSize:     [20, 20], // size of the icon
  iconAnchor:   [10, 10], // point of the icon which will correspond to marker's location
  popupAnchor:  [0, -12] // point from which the popup should open relative to the iconAnchor
});
var subchapterFocusIcon = L.icon({
  iconUrl: 'img/subchapter_focus.png',
  iconSize:     [20, 20], // size of the icon
  iconAnchor:   [10, 10], // point of the icon which will correspond to marker's location
  popupAnchor:  [0, -12] // point from which the popup should open relative to the iconAnchor
});
var subchapterDimIcon = L.icon({
  iconUrl: 'img/subchapter_dim.png',
  iconSize:     [20, 20], // size of the icon
  iconAnchor:   [10, 10], // point of the icon which will correspond to marker's location
  popupAnchor:  [0, -12] // point from which the popup should open relative to the iconAnchor
});

      
// initialize leaflet map
var map = L.map('map', {
    center: [11, 121],
    zoom: 4,
    zoomControl: false,
    maxZoom: 15,
    attributionControl: false,
    // doubleClickZoom: false,
    // dragging: false,
    scrollWheelZoom: false,
});

L.control.zoom({position: 'topright'} ).addTo(map);

// global variables for leaflet map layers
var geojson = L.geoJson();
var markers = new L.featureGroup();  

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
  d3.csv("data/Chapters_Ambulances_20140625.csv", function(data){
    ambulanceData = data;
    getChapterData();
  });
}

function getChapterData() {
  $.ajax({
    type: 'GET',
    url: 'data/PRC_chapters_2014-05-15.geojson',
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
    $.each(chapterData.features, function (index, chapter) {
        var thisRegion = chapter.properties.REGION;    
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
    getAmbulanceLocations();
    
}

function getAmbulanceLocations(){
  $.each(ambulanceData, function (index, ambulance){
    var thisLocation = ambulance.CODE;
    if ($.inArray(thisLocation, ambulanceLocations) === -1){
      ambulanceLocations.push(thisLocation);
    }
  });
  regionSelect("All Regions");
}


function setIconType(feature){
  if(feature.properties.TYPE === "NHQ"){
    if($.inArray(feature.properties.CODE, ambulanceLocations) !== -1){
      return nhqFocusIcon;
    } else {
      return nhqDimIcon;
    }
  } 
  if(feature.properties.TYPE === "CHAPTER"){
    if($.inArray(feature.properties.CODE, ambulanceLocations) !== -1){
      return chapterFocusIcon;
    } else {
      return chapterDimIcon;
    }
  } 
  if(feature.properties.TYPE === "SUB-CHAPTER"){
    if($.inArray(feature.properties.CODE, ambulanceLocations) !== -1){
      return subchapterFocusIcon;
    } else {
      return subchapterDimIcon;
    }
  }    
}

var marker = [];

function regionSelect(region) {
  marker = [];
  $('#selectedRegion').html(region);
  $('#ambulanceInfo').empty();
  map.removeLayer(markers);
  markers = new L.featureGroup();

  // L.MarkerClusterGroup({
  //   maxClusterRadius: 15,
  //   showCoverageOnHover:false, 
  //   // spiderfyDistanceMultiplier:2,
  //   iconCreateFunction: function(cluster) {
  //     return new L.DivIcon({ html:'<div></div>', className: 'marker-cluster', iconSize: new L.Point(20, 20) });
  //   }
  // });  
  displayedChapters = [];
  $.each(chapterData.features, function(index, chapter){
    if(chapter.properties.REGION === region || region === "All Regions"){
      displayedChapters.push(chapter);
    }
  });
  marker = L.geoJson(displayedChapters, {
    pointToLayer: function (feature, latlng) {
      return L.marker(latlng, {icon: setIconType(feature)});
    },
    onEachFeature: onEachChapter
  });
  markers.addLayer(marker);
  markers.addTo(map);
  markersBounds = markers.getBounds();
  map.fitBounds(markersBounds);
  // create chapter dropdown menu with only displayed chapters
  createChaptersDropdowns(); 
};

function createChaptersDropdowns(region) {
  var chapterNameList = [];
  $('#dropdown-menu-chapters').empty();
  $.each(displayedChapters, function (index, chapter) {
      chapterNameList.push(chapter.properties.NAME);    
  });
  // sort so that the chapters appear in alphabetical order in dropdown
  chapterNameList = chapterNameList.sort(); 
  // create item elements in dropdown list   
  for(var i = 0; i < chapterNameList.length; i++) {
      var thisChapterName = chapterNameList[i];
      var listItemHtml = '<li><a href="#" onClick="chapterSelect(' +"'"+ thisChapterName +"'"+ '); return false;">' + thisChapterName + "</li>"
      $('#dropdown-menu-chapters').append(listItemHtml);       
  }  
}

function chapterSelect(name) {
  var thisChapterCode = "";
  var thisChapterType = "";
  $.each(chapterData.features, function(index, chapter){
    if(chapter.properties.NAME === name){
      thisChapterCode = chapter.properties.CODE;
      thisChapterType = chapter.properties.TYPE;
      setZoom = map.getZoom();
      if(setZoom < 10){
        setZoom = 10;
      }
      map.setView([chapter.geometry.coordinates[1], chapter.geometry.coordinates[0]], setZoom);
    }
  });
  $('#ambulanceInfo').empty();
  // find all ambulances in data for the selected chapter
  var selectedChapterAmbulances = [];
  $.each(ambulanceData, function (index, ambulance){
    if(thisChapterCode === ambulance.CODE){
      selectedChapterAmbulances.push(ambulance);
    }
  });
  // if no ambulances are found in the data, tell the user
  if(selectedChapterAmbulances.length === 0){
    $('#ambulanceInfo').append("<h4>" + name + " <small>(" + thisChapterType + ")</small></h4> No ambulance at this location.");
  } else {
    // if there are ambulances, display the data for each in the info side bar 
    $('#ambulanceInfo').append("<h4>" + name + " <small>(" + thisChapterType + ")</small></h4>");
    for(var i = 0; i < selectedChapterAmbulances.length; i++) {
      var item = selectedChapterAmbulances[i];
      var ambulanceHtml = '<div><img class="ambulanceIcon" src="img/ambulance_OCHAremix.png" />' +
        selectedChapterAmbulances[i].BRAND + " | " + selectedChapterAmbulances[i].Plate_No + " | " +
        selectedChapterAmbulances[i].STATUS + "</div>";
      $('#ambulanceInfo').append(ambulanceHtml);
    }
  }
  var mappedMarkers = marker._layers;
  $.each(mappedMarkers, function(index, thisMarker){
    if(thisMarker.feature.properties.CODE === thisChapterCode){
      setTimeout(function(){
        thisMarker.openPopup();
      },400);
    }
  });
}

// define events attached to each marker
function onEachChapter(feature, layer){
  layer.bindPopup("<strong>" + feature.properties.NAME + "</strong><br>" + ambulanceCount(feature.properties.CODE));
  layer.on('click', function(e) {
    markerClick(e);
  });
}

function ambulanceCount(chapterCode){
  var ambulanceCount = 0;
  $.each(ambulanceData, function (index, ambulance){
    if(chapterCode === ambulance.CODE){
      ambulanceCount += 1;
    }
  });
  if(ambulanceCount === 0){
    return "no ambulance"
  } else if(ambulanceCount === 1){
    return "1 ambulance"
  } else {
    return ambulanceCount.toString() + " ambulances";
  }
}

function zoomOut(){
  map.fitBounds(markersBounds);
} 

// on marker click display ambulance data for that chapter
function markerClick(e){
  var clickTarget = e.target;
  chapterSelect(clickTarget.feature.properties.NAME);
}

// show disclaimer text on click of dislcaimer link
function showDisclaimer() {
    window.alert("The maps on this page do not imply the expression of any opinion on the part of the Philippine Red Cross concerning the legal status of a territory or of its authorities. Boundary data from GADM.");
}

// adjust map div height on screen resize
$(window).resize(function(){
  mapHeight = $(window).height() - 90;
  $("#map").height(mapHeight);
  $("#infoWrapper").height(mapHeight);
});

// start function chain for page build
getWorld();