var dojoConfig = { parseOnLoad: true };

var map, draw_toolbar, edit_toolbar, draw_tool, current_color, current_layer, dump = {};


require([
    'esri/map',

    "esri/toolbars/draw", "esri/toolbars/edit", "esri/graphic", "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/SimpleFillSymbol", "esri/symbols/SimpleLineSymbol", "esri/Color", "dijit/ColorPalette",

    'esri/dijit/Scalebar', 'esri/dijit/Legend', 'esri/dijit/OverviewMap',

    "esri/layers/ArcGISDynamicMapServiceLayer", "esri/layers/FeatureLayer",

    "dojo/parser",
    'dojo/_base/array', 'dojo/on', 'dojo/query', 'dojo/dom', 'dojo/_base/event', 'dojo/domReady!'
],  function(Map, Draw, Edit, Graphic, SimpleMarkerSymbol, SimpleFillSymbol, SimpleLineSymbol, Color, ColorPalette,
             Scalebar, Legend, OverviewMap, ArcGISDynamicMapServiceLayer,
             FeatureLayer, parser, arrayUtils, on, query, dom, event) {
        map = new Map('map', {
            center: [-93.5, 36.972],
            zoom: 4,
            basemap: 'streets'
        });

        parser.parse();

        var dynamic_layer = new ArcGISDynamicMapServiceLayer("http://sampleserver6.arcgisonline.com/arcgis/rest/services/USA/MapServer");

        var landuseLineLayer = new FeatureLayer("http://sampleserver6.arcgisonline.com/arcgis/rest/services/Military/FeatureServer/8", {
          mode: FeatureLayer.MODE_SNAPSHOT,
          outFields: ["*"]
        });
        var landusePolygonLayer = new FeatureLayer("http://sampleserver6.arcgisonline.com/arcgis/rest/services/Military/FeatureServer/9", {
          mode: FeatureLayer.MODE_SNAPSHOT,
          outFields: ["*"]
        });

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

        map.on("load", init);
        map.on("layers-add-result", updateLegend);
        map.on("click", function(evt) { edit_toolbar.deactivate(); });

        map.addLayers([dynamic_layer, landuseLineLayer, landusePolygonLayer]);
        dynamic_layer.on('load', buildLayerList);

        function updateLegend(evt) {
            var layerInfo = arrayUtils.map(evt.layers, function (layer, index) {
                return {layer:layer.layer, title:layer.layer.name};
            });
            if (layerInfo.length > 0) {
                var legendDijit = new Legend({
                    map: map,
                    layerInfos: layerInfo
                }, "legend-panel");
                legendDijit.startup();
            }
        }

        function buildLayerList() {
            var visible = [];
            var items = arrayUtils.map(dynamic_layer.layerInfos, function(info, index) {
                is_showed = false;
                if (info.name == 'Counties') {
                    visible.push(info.id);
                    is_showed = true;
                }
                var output = '';
                output += '<input type="checkbox" class="list_item"' + (is_showed ? " checked" : "") +
                    ' id="' + info.id + '" />' + '<label for="' + info.id + '">' + info.name + '</label>';
                if ((index + 1) % 2 == 0) {
                    output += '<br />';
                }
                return output;
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

        function activateDrawTool() {
            draw_tool = this.value;
            query('*').style('cursor', 'crosshair');
            if (draw_tool == 'DELETE') {
                return;
            }

            draw_toolbar.activate(Draw[draw_tool]);
        }

        function init(evt) {
            createDrawTools();
            createEditTools();
            createColorPicker();

            current_color = '#ffffff';
            current_layer = null;
            draw_tool = null;

            printConsole();
        }

        function createDrawTools() {
            draw_toolbar = new Draw(map, { showTooltips: false });
            draw_toolbar.on('draw-end', addGraphicToMap)
            var tools = query('.tool');
            arrayUtils.forEach(tools, function(tool) {
                on(tool, 'click', activateDrawTool);
            });
        }

        function createEditTools() {
            edit_toolbar = new Edit(map);
        }

        function createColorPicker() {
            var myPalette = new ColorPalette({
                palette: "3x4",
                onChange: function(val){ current_color = val; }
            }, "color-panel");
        }

        function addGraphicToMap(evt) {
            var symbol;
            resetCursor();
            draw_toolbar.deactivate();
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
                break;
            }
            symbol.setColor(Color.fromHex(current_color));
            var graphic = new Graphic(evt.geometry, symbol);
            map.graphics.add(graphic);
            updateEditableGraphics();
        }

        function updateEditableGraphics() {
            map.graphics.on("click", function(evt) {
                event.stop(evt);
                if (draw_tool == 'DELETE') {
                    map.graphics.remove(evt.graphic);
                    resetCursor();
                    return;
                }
                activateEditToolbar(evt.graphic);
          });
        }

        function resetCursor() {
            query('*').style('cursor', '');
        }

        function activateEditToolbar(graphic) {
            tool = Edit.MOVE | Edit.Scale | Edit.EDIT_VERTICES | Edit.Scale | Edit.ROTATE;
            var options = {
                allowAddVertices: true,
                allowDeleteVertices: true,
                uniformScaling: true
            };
            edit_toolbar.activate(tool, graphic, options);
        }

        function printConsole() {
            dump.color = current_color;
            dump.layer = current_layer;
            dump.tool = draw_tool;
            console.log(dump);
        }

        /* Init all tools */
        overviewMapDijit.startup();
    });
