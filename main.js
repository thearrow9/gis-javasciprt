var dojoConfig = { parseOnLoad: true };

var map, dynamic_layer, draw_toolbar, edit_toolbar, draw_tool;

require([
    'esri/map',

    "esri/toolbars/draw", "esri/toolbars/edit", "esri/graphic", "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/SimpleFillSymbol", "esri/symbols/SimpleLineSymbol", "esri/Color",

    'esri/dijit/Scalebar', 'esri/dijit/Legend', 'esri/dijit/OverviewMap',

    "esri/layers/ArcGISDynamicMapServiceLayer", //"esri/layers/FeatureLayer",

    'dojo/_base/array', 'dojo/on', 'dojo/query', 'dojo/dom', 'dojo/_base/event', 'dojo/domReady!'
],  function(Map, Draw, Edit, Graphic, SimpleMarkerSymbol, SimpleFillSymbol, SimpleLineSymbol, Color,
             Scalebar, Legend, OverviewMap, ArcGISDynamicMapServiceLayer,
             /*FeatureLayer, */arrayUtils, on, query, dom, event) {
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
        map.on("click", function(evt) { edit_toolbar.deactivate(); });

        map.addLayers([dynamic_layer]);
        dynamic_layer.on('load', buildLayerList);

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


        function activateDrawTool() {
            draw_tool = this.value;
            query('*').style('cursor', 'crosshair');
            if (draw_tool == 'DELETE') {
                return;
            }

            draw_toolbar.activate(Draw[draw_tool]);
        }

        function createDrawTools(){
            draw_toolbar = new Draw(map, { showTooltips: false });
            draw_toolbar.on('draw-end', addGraphicToMap)
            var tools = query('.tool');
            arrayUtils.forEach(tools, function(tool) {
                on(tool, 'click', activateDrawTool);
            });
            edit_toolbar = new Edit(map);
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
                //symbol.setColor(Color([255,255,0,0.5]));
                break;
            }
            var graphic = new Graphic(evt.geometry, symbol);
            map.graphics.add(graphic);
            updateEditableGraphics();
        }

        function updateEditableGraphics() {
          map.graphics.on("click", function(evt) {
            event.stop(evt);
            if(draw_tool == 'DELETE') {
                evt.graphic.hide();
                draw_toolbar.deactivate();
                resetCursor();
                return;
            }
            activateToolbar(evt.graphic);
          });

        }

        function resetCursor() {
            query('*').style('cursor', '');
        }

        function activateToolbar(graphic) {
            tool = Edit.MOVE | Edit.Scale | Edit.EDIT_VERTICES | Edit.Scale | Edit.ROTATE;
            var options = {
                allowAddVertices: true,
                allowDeleteVertices: true,
                uniformScaling: true
            };
            edit_toolbar.activate(tool, graphic, options);
        }

        /* Init all tools */
        overviewMapDijit.startup();
    });
