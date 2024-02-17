// Declare variables globally so all functions have access
var map;
var minValue;
var attributes;
var index = 0;

// Function to instantiate the Leaflet map
function createMap(){

    // Create the map
    map = L.map('map', {
        center: [43, -100],
        zoom: 3
    });

    // Add OSM base tilelayer
    L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(map);

    // Call getData function
    getData();
};


// Calculate min value
function calculateMinValue(data){
    
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
    // Get minimum value of array
    var minValue = Math.min(...allValues)

    return minValue;
}


// Calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    
    // Constant factor adjusts symbol sizes evenly
    var minRadius = 3;
    
    // Flannery Apperance Compensation formula
    var radius = 1.0083 * Math.pow(attValue/minValue,0.5715) * minRadius

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
        fillColor: "#ff7800",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8,
        radius: radius
    };

    // Create circle marker layer
    var layer = L.circleMarker(latlng, options);

    // Build popup content string
    var popupContent = "<p><b>" + feature.properties.State.toUpperCase() + "</b>" ;
    popupContent += "<br><br>In <b>" + attribute.slice(-4) + "</b>, <b>" + feature.properties[attribute] + "%</b> of people 25 years old or over with a bachelor's degree are in <b>poverty</b></p>";
    
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


// Create new sequence controls
function createSequenceControls(){
    //create range input element (slider)
    var slider = "<input class='range-slider' type='range'></input>";
    document.querySelector("#panel").insertAdjacentHTML('beforeend',slider);

// Set slider attributes
var rangeSlider = document.querySelector(".range-slider");   
rangeSlider.max = 6;
rangeSlider.min = 0;
rangeSlider.value = 0;
rangeSlider.step = 1;
    
// Add step buttons
var reverseButton = "<button class='step' id='reverse'><img src='img/reverse.png'></button>";
var forwardButton = "<button class='step' id='forward'><img src='img/forward.png'></button>";
document.querySelector('#panel').insertAdjacentHTML('beforeend', reverseButton);
document.querySelector('#panel').insertAdjacentHTML('beforeend', forwardButton);
    
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
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
            
            // Access feature properties
            var props = layer.feature.properties;

            // Update each feature's radius based on new attribute values
            var radius = calcPropRadius(props[attribute]);
            layer.setRadius(radius);

            // Build popup content string
            var popupContent = "<p><b>" + props.State.toUpperCase() + "</b>" ;

            // Add formatted attribute to panel content string
            var year = attribute.split("_")[4];
            popupContent += "<br><br>In <b>" + attribute.slice(-4) + "</b>, <b>" + props[attribute] + "%</b> of people 25 years old or over with a bachelor's degree are in <b>poverty</b></p>";

            // Update popup content            
            popup = layer.getPopup();            
            popup.setContent(popupContent).update();
        };
    });
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
        
            // Calculate minimum data value
            minValue = calculateMinValue(json);
        
            // Call function to create proportional symbols
            createPropSymbols(json, attributes);
            createSequenceControls();
        })
};


// Wait for the DOM to load before creating the map
document.addEventListener('DOMContentLoaded',createMap)
