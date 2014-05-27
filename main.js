var dynamicLayerUrl = 'http://sampleserver6.arcgisonline.com/arcgis/rest/services/USA/MapServer';
var featureServerUrl = 'http://sampleserver6.arcgisonline.com/arcgis/rest/services/Military/FeatureServer/';

require([
    'esri/map',
    "esri/dijit/BasemapToggle",

    "esri/toolbars/draw", "esri/toolbars/edit", "esri/graphic", "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/SimpleFillSymbol", "esri/symbols/SimpleLineSymbol", "esri/Color",

    "esri/dijit/editing/TemplatePicker",

    'esri/dijit/Scalebar', 'esri/dijit/Legend', 'esri/dijit/OverviewMap',

    "esri/layers/ArcGISDynamicMapServiceLayer", "esri/layers/FeatureLayer",

    "dojo/parser",
    "dojo/_base/lang",
    'dojo/_base/array', 'dojo/on', 'dojo/query', 'dojo/dom', 'dojo/_base/event', 'dojo/domReady!'
],  function(Map, BasemapToggle, Draw, Edit, Graphic, SimpleMarkerSymbol, SimpleFillSymbol, SimpleLineSymbol, Color, TemplatePicker,
             Scalebar, Legend, OverviewMap, ArcGISDynamicMapServiceLayer,
             FeatureLayer, parser, lang, arrayUtils, on, query, dom, event) {

        map = new Map('map', {
            center: [-93.5, 36.972],
            zoom: 4,
            basemap: 'streets'
        });
        parser.parse();

        var map, overviewMapDijit;

        var drawToolbar, editToolbar, selectedTemplate;

        var legendDijit, layers, currentLayer;


        var dynamicLayer = new ArcGISDynamicMapServiceLayer(dynamicLayerUrl);
        var landusePointLayer = buildFeatureLayer(featureServerUrl + '6')
        var landusePolylineLayer = buildFeatureLayer(featureServerUrl + '8')



        function buildFeatureLayer(url) {
            return new FeatureLayer(url, {
                mode: FeatureLayer.MODE_SNAPSHOT,
                outFields: ["*"]
            });
        }

        function createScalebar() {
            return new Scalebar({
                map: map,
                attachTo: 'bottom-left',
                scalebarStyle: 'line',
                scalebarUnit: 'metric'
            });
        }

        function createOverviewMap() {
            overviewMapDijit = new OverviewMap({
                map: map,
                visible: true,
                height: 120,
                width: 160,
                opacity: .3
            });
            overviewMapDijit.startup();
        }

        function createBasemapToggle() {
            return new BasemapToggle({
                map: map,
                basemap: "satellite"
            }, "basemap-toggle").startup();
        }

        function createTemplatePicker() {
            templatePicker = new TemplatePicker({
                featureLayers: layers,
                rows: "auto",
                columns: 2,
                grouping: true,
                style: "height: auto; overflow: auto;"
            }, "template-picker");
            templatePicker.startup();
            templatePicker.on("selection-change", changeTmpTool);
        }

        function changeTmpTool() {
            query('*').style('cursor', 'crosshair');
            var tmp = templatePicker.getSelected();
            if (tmp) {
                selectedTemplate = tmp;
            }
            switch (selectedTemplate.featureLayer.geometryType) {
            case "esriGeometryPoint":
                drawToolbar.activate(Draw.POINT);
                break;
            case "esriGeometryPolyline":
                drawToolbar.activate(Draw.POLYLINE);
                break;
            case "esriGeometryPolygon":
                drawToolbar.activate(Draw.POLYGON);
                break;
            }
        }

        map.on("load", mapInit);
        map.on('update-end', mapUpdateEnd);
        map.on("layers-add-result", mapLayersAdd);
        map.on("click", function(evt) { editToolbar.deactivate(); });

        dynamicLayer.on('load', createLayerList);

        function mapInit(evt) {
            map.addLayers([dynamicLayer, landusePointLayer, landusePolylineLayer]);
            createScalebar();
            createBasemapToggle();
            createOverviewMap();
        }

        function mapUpdateEnd(evt) {
            legendDijit.refresh();
        }

        function mapLayersAdd(evt) {
            layers = arrayUtils.map(evt.layers, function(result) {
                return result.layer;
            });

            createLegend(evt);
            createTemplatePicker();
            createDrawToolbar();
            createEditToolbar();

            arrayUtils.forEach(layers, function(layer) {
                var editingEnabled = false;
                layer.on("dbl-click", function(evt) {
                    event.stop(evt);
                    currentLayer = this;
                    if (editingEnabled === false) {
                        editingEnabled = true;
                        activateEditToolbar(evt.graphic);
                    } else {
                        editToolbar.deactivate();
                        editingEnabled = false;
                    }
                });
                layer.on("click", function(evt) {
                    event.stop(evt);
                    if (evt.ctrlKey === true || evt.metaKey === true) {
                        var conf = confirm('Сигурни ли сте, че искате да изтриете този обект?');
                        if (conf) {
                            layer.applyEdits(null,null,[evt.graphic]);
                            currentLayer = this;
                        }
                        editToolbar.deactivate();
                        editingEnabled = false;
                    }
                });
            });
        }



        function createLegend(evt) {
            var layerInfo = arrayUtils.map(evt.layers, function (layer, index) {
                if (layer.layer.supportsDynamicLayers) {
                    return { layer:layer.layer, title:layer.layer.name };
                }
                else return {};
            });
            if (layerInfo.length > 0) {
                legendDijit = new Legend({
                    map: map,
                    layerInfos: layerInfo
                }, "legend-panel");
                legendDijit.startup();
            }
        }

        function createLayerList() {
            var visible = [];
            var items = arrayUtils.map(dynamicLayer.layerInfos, function(info, index) {
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
            dynamicLayer.setVisibleLayers(visible);
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
            dynamicLayer.setVisibleLayers(visible);
        }

        function activateDrawTool() {
            draw_tool = this.value;
            if (draw_tool == 'DELETE') {
                return;
            }

            draw_toolbar.activate(Draw[draw_tool]);
        }

        function createDrawToolbar() {
            drawToolbar = new Draw(map, { showTooltips: false });
            drawToolbar.on('draw-end', createGraphic)
        }

        function createGraphic(evt) {
            drawToolbar.deactivate();
            var newAttributes = lang.mixin({}, selectedTemplate.template.prototype.attributes);
            var newGraphic = new Graphic(evt.geometry, null, newAttributes);
            selectedTemplate.featureLayer.applyEdits([newGraphic], null, null);
            map.graphics.add(newGraphic);
            updateEditableGraphics();
        }

        function createEditToolbar() {
            editToolbar = new Edit(map);
            editToolbar.on("deactivate", function(evt) {
                currentLayer.applyEdits(null, [evt.graphic], null);
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
            editToolbar.activate(tool, graphic, options);
        }
    });
