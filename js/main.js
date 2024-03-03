// Declare variables globally so all functions have access
var map;
var minValue;
var attributes;
var index = 0;
var dataStats = {}; 


// Add event listeners for splash screen
document.addEventListener('DOMContentLoaded', function () {
    const splashScreen = document.getElementById('splash-screen');
    const closeButton = document.getElementById('close-splash');
    
    // Add event listener to close the splash screen when clicked
    closeButton.addEventListener('click', function () {
        splashScreen.style.display = 'none';
    });
});


// Function to instantiate the Leaflet map
function createMap(){

    // Create the map
    map = L.map('map', {
        center: [36, -92],
        zoom: 4
    });
    
    // Add CartoDB Positron basemap
    var CartoDB_Positron = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);
    
    // Add OSM base tilelayer
    var OSM = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 20,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    });
    
    // Add USGS basemap
    var USGS = L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}', {
         maxZoom: 20,
         attribution: 'Tiles courtesy of the <a href="https://usgs.gov/">U.S. Geological Survey</a>'
    });
    
    // Add USGS Imagery basemap
    var USGS_USImageryTopo = L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryTopo/MapServer/tile/{z}/{y}/{x}', {
		maxZoom: 20,
		attribution: 'Tiles courtesy of the <a href="https://usgs.gov/">U.S. Geological Survey</a>'
	});
    
    var baseMaps = {
        "CartoDB Positron": CartoDB_Positron,
        "OpenStreetMap": OSM,
        "USGS Topo Map": USGS,
        "USGS Imagery": USGS_USImageryTopo,
	};
    
    layerControl = L.control.layers(baseMaps).addTo(map);

    // Call getData function
    getData();
};


// Calculate stats
function calcStats(data){
    
    // Create empty array to store all data values
    var allValues = [];
    
    // Loop through each state
    for(var state of data.features){
        
        // Loop through each year
        for(var year = 2016; year <= 2022; year++){
            
              // Get value for current year
              var value = state.properties["Percent_Poverty_Bachelors_Over25_" + String(year)];
            
              // Add value to array
              allValues.push(value);
        }
    }
    
    // Get min, max stats
    dataStats.min = Math.min(...allValues);
    dataStats.max = Math.max(...allValues);
    
    // Calculate mean
    var sum = allValues.reduce(function(a, b){return a+b;});
    dataStats.mean = sum/ allValues.length;
}


// Calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    
    // Constant factor adjusts symbol sizes evenly
    var minRadius = 3;
    
    // Flannery Apperance Compensation formula
    var radius = 1.0083 * Math.pow(attValue/dataStats.min,0.5715) * minRadius

    return radius;
};


// Function to convert markers to circle markers
function pointToLayer(feature, latlng){
    
    // Determine which attribute to visualize with proportional symbols
    var attribute = attributes[index];
    
    // For each feature, determine its value for the selected attribute
    var attValue = feature.properties[attribute];
    
    // Give each feature's circle marker a radius based on its attribute value
    var radius = calcPropRadius(attValue);
    
    // Create marker options
    var options = {
        fillColor: "#f20a0a",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8,
        radius: radius
    };

    // Create circle marker layer
    var layer = L.circleMarker(latlng, options);

    // Build popup content string
    var popupContent = createPopupContent(feature.properties, attribute);
    
    // Bind the popup to the circle marker
    layer.bindPopup(popupContent, { offset: new L.Point(0,-radius) });

    // Return the circle marker to the L.geoJson pointToLayer option
    return layer;
};


// Add circle markers for point features to the map
function createPropSymbols(data, attributes){
    
	 // Create a Leaflet GeoJSON layer and add it to the map
	 L.geoJson(data, {
		pointToLayer: function(feature, latlng){
			return pointToLayer(feature, latlng);
		}
	 }).addTo(map);
};


// Create popup
function createPopupContent(properties, attribute){
    
    // Build popup content string
    var popupContent = "<p><b>" + properties.State.toUpperCase() + "</b>" ;

    // Add formatted attribute to content string
    var year = attribute.split("_")[4];
    popupContent += "<br><br>In <b>" + attribute.slice(-4) + "</b>, <b>" + properties[attribute] + "%</b> of people 25 years old or over with a bachelor's degree were in <b>poverty</b></p>";

    return popupContent;
};


// Create new sequence controls
function createSequenceControls(){
    var SequenceControl = L.Control.extend({
        options: {
            position: 'bottomleft'
        },

        onAdd: function () {
            // Create the control container div
            var container = L.DomUtil.create('div', 'sequence-control-container');

            // Create slider
			container.insertAdjacentHTML('beforeend', '<input class="range-slider" type="range">')
			
			// Add skip buttons
			container.insertAdjacentHTML('beforeend', '<button class="step" id="reverse" title="Reverse"><img src="img/reverse.png"></button>'); 
			container.insertAdjacentHTML('beforeend', '<button class="step" id="forward" title="Forward"><img src="img/forward.png"></button>');
			
			// Disable mouse event listeners for container
			L.DomEvent.disableClickPropagation(container);

            return container;
        }
    });

    map.addControl(new SequenceControl());
    
    // Set slider attributes
    var rangeSlider = document.querySelector(".range-slider");   
    rangeSlider.max = 6;
    rangeSlider.min = 0;
    rangeSlider.value = 0;
    rangeSlider.step = 1;

    // Click listener for step buttons
    document.querySelectorAll('.step').forEach(function(step){
        step.addEventListener("click", function(){

            // Get the current index value from the slider
            var index = Number(document.querySelector('.range-slider').value);

            // Increment or decrement depending on button clicked
            if (step.id == 'forward'){
                index++;

                // If past the last attribute, wrap around to first attribute
                index = index > 6 ? 0 : index;

            } else if (step.id == 'reverse'){
                index--;

                // If past the first attribute, wrap around to last attribute
                index = index < 0 ? 6 : index;
            };

            // Update slider
            document.querySelector('.range-slider').value = index;

            // Update the proportional symbols
            updatePropSymbols(attributes[index]);
        });
    });

    // Add input listener for the slider
    document.querySelector('.range-slider').addEventListener('input', function () {

    // Get the new index value from the slider
    var index = this.value;

    // Update the proportional symbols
    updatePropSymbols(attributes[index]);
    });
};


// Resize proportional symbols according to new attribute values
function updatePropSymbols(attribute){
    var year = attribute.split("_")[4];
    
	// Update legend
	document.querySelector("span.year").innerHTML = year;
    
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
            
            // Access feature properties
            var props = layer.feature.properties;

            // Update each feature's radius based on new attribute values
            var radius = calcPropRadius(props[attribute]);
            layer.setRadius(radius);

            // Build popup content string
            var popupContent = createPopupContent(props, attribute);

            // Update popup content            
            popup = layer.getPopup();            
            popup.setContent(popupContent).update();
        };
    });
};


// Function to create the legend
function createLegend(attributes){
    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },

        onAdd: function () {
            // Create the control container
            var container = L.DomUtil.create('div', 'legend-control-container');

            container.innerHTML = '<p class="temporalLegend">Poverty in <span class="year">2016</span><br></p>'
            + '<p>Combined max, mean, and min<br>values from 2016-2022</p>';
            
            // Start attribute legend svg string
            var svg = '<svg id="attribute-legend" width="210px" height="80px">';
            
            // Array of circle names to base loop on
            var circles = ["max", "mean", "min"];
            
            // Loop to add each circle and text to svg string
            for (var i=0; i<circles.length; i++){
                
                // Assign the r and cy attributes  
                var radius = (calcPropRadius(dataStats[circles[i]])*3);  
                var cy = 60 - radius;  
                
                // Circle string            
                svg += '<circle class="legend-circle" id="' + circles[i] + '" r="' + radius + '"cy="' + cy + '" fill="#f20a0a" fill-opacity="0.8" stroke="#000000" cx="30"/>';

                // Evenly space out labels            
                var textY = i * 20 + 20;
                
                // Text string            
                svg += '<text id="' + circles[i] + '-text" x="95" y="' + textY + '">' + Math.round(dataStats[circles[i]]*100)/100 + "%" + '</text>';
                
            };
            
            // Close svg string
            svg += "</svg>";

            // Add attribute legend svg to container
            container.insertAdjacentHTML('beforeend',svg);

            return container;
        }
    });

    map.addControl(new LegendControl());

};


// Create attributes array from the data
function processData(data){
    
	 // Empty array to hold attributes
	 var attributes = [];
	 
	 // Properties of the first feature in the data
	 var properties = data.features[0].properties;
	 
	 // Push each attribute name into array
	 for (var attribute in properties){
         
         // Only take attributes with poverty values
         if (attribute.indexOf("Percent_Poverty_Bachelors_Over25") > -1){
             attributes.push(attribute);
         };
     };
	 
	 return attributes.reverse();
};


// Import GeoJSON data
function getData(){
    
    // Load the data
    fetch("data/Poverty.geojson")
        .then(function(response){
            return response.json();
        })
        .then(function(json){
        
            // Process attributes array
			attributes = processData(json);
        
            // Calculate stats
            calcStats(json);
        
            // Call function to create proportional symbols
            createPropSymbols(json, attributes);
        
            // Call function to create sequence controls
            createSequenceControls(attributes);
        
            // Create legend
            createLegend(json);
        
        })
};


// Wait for the DOM to load before creating the map
document.addEventListener('DOMContentLoaded',createMap)
