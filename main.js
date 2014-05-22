var map;
require([
    "esri/map",
    "esri/dijit/Scalebar",
    "dojo/domReady!"
    ], function(Map, Scalebar) {

        map = new Map("mapDiv", {
            center: [0, 0],
            zoom: 4,
            basemap: "streets"
        });

        var scalebar = new Scalebar({
            map: map,
            attachTo: 'bottom-left',
            scalebarStyle: 'line',
            scalebarUnit: "metric"
        });
    });
