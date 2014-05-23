var dojoConfig = { parseOnLoad: true };

var map;
require([
    'esri/map',
    'esri/dijit/Scalebar',
    'esri/dijit/Legend',
    'esri/dijit/OverviewMap',
    "esri/layers/ArcGISDynamicMapServiceLayer",
    'dojo/domReady!'
],  function(Map, Scalebar, Legend, OverviewMap, ArcGISDynamicMapServiceLayer) {
        map = new Map('mapDiv', {
            center: [25, 43],
            zoom: 4,
            basemap: 'streets'
        });

        layer = new ArcGISDynamicMapServiceLayer(
            "http://sampleserver6.arcgisonline.com/arcgis/rest/services/WorldTimeZones/MapServer");

        var scalebar = new Scalebar({
            map: map,
            attachTo: 'bottom-left',
            scalebarStyle: 'line',
            scalebarUnit: 'metric'
        });

        var overviewMapDijit = new OverviewMap({
            map: map,
            //attachTo: 'top-right',
            visible: true,
            color: '#D84E13',
            height: 120,
            width: 160,
            opacity: .3
        });

        var legend = new Legend({
            map: map
        }, "legend");


        map.addLayer(layer)

        /* Init all tools */
        overviewMapDijit.startup();
        legend.startup();
    });
