var dojoConfig = { parseOnLoad: true };

var map, dynamic_layer, toolbar;

require([
    'esri/map',

    "esri/toolbars/draw", "esri/graphic", "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/SimpleFillSymbol", "esri/symbols/SimpleLineSymbol", "esri/Color",

    'esri/dijit/Scalebar', 'esri/dijit/Legend', 'esri/dijit/OverviewMap',

    "esri/layers/ArcGISDynamicMapServiceLayer", //"esri/layers/FeatureLayer",

    'dojo/_base/array', 'dojo/on', 'dojo/query', 'dojo/dom', 'dojo/domReady!'
],  function(Map, Draw, Graphic, SimpleMarkerSymbol, SimpleFillSymbol, SimpleLineSymbol, Color,
             Scalebar, Legend, OverviewMap, ArcGISDynamicMapServiceLayer,
             /*FeatureLayer, */arrayUtils, on, query, dom) {
        map = new Map('map', {
            center: [-93.5, 36.972],
            zoom: 4,
            basemap: 'streets'
        });

        dynamic_layer = new ArcGISDynamicMapServiceLayer("http://sampleserver6.arcgisonline.com/arcgis/rest/services/USA/MapServer");

        var scalebar = new Scalebar({
            map: map,
            attachTo: 'bottom-left',
            scalebarStyle: 'line',
            scalebarUnit: 'metric'
        });

        var overviewMapDijit = new OverviewMap({
            map: map,
            visible: true,
            height: 120,
            width: 160,
            opacity: .3
        });

        map.on("load", createDrawTools);
        map.on("layers-add-result", updateLegend);

        function updateLegend(evt) {
            var layerInfo = arrayUtils.map(evt.layers, function (layer, index) {
                return {layer:layer.layer, title:layer.layer.name};
            });
            if (layerInfo.length > 0) {
                var legendDijit = new Legend({
                    map: map,
                    layerInfos: layerInfo
                }, "legend");
                legendDijit.startup();
            }
        }

        map.addLayers([dynamic_layer]);
        dynamic_layer.on('load', buildLayerList);

        function buildLayerList() {
            var visible = [];
            var items = arrayUtils.map(dynamic_layer.layerInfos, function(info, index) {
                is_showed = false;
                if (info.name == 'Counties') {
                    visible.push(info.id);
                    is_showed = true;
                }
                return '<input type="checkbox" class="list_item"' + (is_showed ? " checked" : "") +
                    ' id="' + info.id + '" />' + '<label for="' + info.id + '">' + info.name + '</label>';

            });
            var layer_list = dom.byId("layer-list");
            layer_list.innerHTML = items.join("\n");
            dynamic_layer.setVisibleLayers(visible);
            on(layer_list, "click", updateLayerVisibility);
        }

        function updateLayerVisibility() {
            var inputs = query(".list_item");
            var input, visible = [];

            arrayUtils.forEach(inputs, function(input) {
                if (input.checked) {
                    visible.push(input.id);
                }
            });

            if (visible.length === 0) {
                visible.push(-1);
            }
            dynamic_layer.setVisibleLayers(visible);
        }

        var tools = query('.tool');
        arrayUtils.forEach(tools, function(tool) {
            on(tool, 'click', activateTool);
        });

        function activateTool() {
            var tool = this.value;
            toolbar.activate(Draw[tool]);
        }

        function createDrawTools(){
            toolbar = new Draw(map);
            toolbar.on('draw-end', addGraphicToMap);
        }

        function addGraphicToMap(evt)
        {
            var symbol;
            toolbar.deactivate();
            switch (evt.geometry.type) {
            case "point":
            case "multipoint":
                symbol = new SimpleMarkerSymbol();
                break;
            case "polyline":
                symbol = new SimpleLineSymbol();
                break;
            default:
                symbol = new SimpleFillSymbol();
                //symbol.setColor(Color([255,255,0,0.5]));
                break;
          }
          var graphic = new Graphic(evt.geometry, symbol);
          map.graphics.add(graphic);
        }

        /* Init all tools */
        overviewMapDijit.startup();
    });
