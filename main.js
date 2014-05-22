var dojoConfig = { parseOnLoad: true };

var map;
require([
    "esri/map",
    "esri/dijit/Scalebar",
    "esri/dijit/OverviewMap",
    "dojo/domReady!"
    ],
    function(Map, Scalebar, OverviewMap) {

        map = new Map("mapDiv", {
            center: [0, 0],
            zoom: 5,
            basemap: "streets"
        });

        var scalebar = new Scalebar({
            map: map,
            attachTo: 'bottom-left',
            scalebarStyle: 'line',
            scalebarUnit: "metric"
        });

        var overviewMapDijit = new OverviewMap({
            map: map,
            attachTo: "top-right",
            visible: true,
            color: "#D84E13",
            height: 180,
            width: 250,
            opacity: .40
        });
        overviewMapDijit.startup();
    });
