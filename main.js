var dynamicLayerUrl = 'http://sampleserver6.arcgisonline.com/arcgis/rest/services/USA/MapServer';
var militaryLayerUrl = 'http://sampleserver6.arcgisonline.com/arcgis/rest/services/Military/FeatureServer/';
var statesUSATaskUrl = 'http://sampleserver1.arcgisonline.com/ArcGIS/rest/services/Demographics/ESRI_Census_USA/MapServer/5';
var earthquakesUrl = 'http://sampleserver3.arcgisonline.com/ArcGIS/rest/services/Earthquakes/EarthquakesFromLastSevenDays/FeatureServer/0';

var map;

require([
    'esri/map',
    "esri/dijit/BasemapToggle",

    "esri/toolbars/draw", "esri/toolbars/edit", "esri/graphic", "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/SimpleFillSymbol", "esri/symbols/SimpleLineSymbol", "esri/tasks/query", 'esri/tasks/QueryTask',

    "esri/dijit/editing/TemplatePicker",

    'esri/dijit/Scalebar', 'esri/dijit/Legend', 'esri/dijit/OverviewMap',

    'esri/renderers/SimpleRenderer', 'esri/Color', 'esri/InfoTemplate',

    "esri/layers/ArcGISDynamicMapServiceLayer", "esri/layers/FeatureLayer", "esri/dijit/AttributeInspector",

    "dojo/parser",
    "dojo/_base/lang", "dojo/dom-construct",
    'dijit/form/Button', 'dijit/Dialog',
    'dojo/_base/array', 'dojo/on', 'dojo/query', 'dojo/dom', 'dojo/_base/event', 'dojo/domReady!'
],  function(Map, BasemapToggle, Draw, Edit, Graphic, SimpleMarkerSymbol, SimpleFillSymbol, SimpleLineSymbol, Query, QueryTask, TemplatePicker,
             Scalebar, Legend, OverviewMap, SimpleRenderer, Color, InfoTemplate, ArcGISDynamicMapServiceLayer, FeatureLayer, AttributeInspector,
             parser, lang, domConstruct, Button, Dialog, arrayUtils, on, query, dom, event) {

        esriConfig.defaults.io.proxyUrl = "/proxy";

        map = new Map('map', {
            center: [-93.5, 36.972],
            zoom: 4,
            basemap: 'streets'
        });
        parser.parse();

        var overviewMapDijit;

        var drawToolbar, editToolbar, selectedTemplate, selectToolbar;

        var bufferArea;

        var legendDijit, layers, currentLayer, dialog;

        var selectQuery, searchQuery, updateFeature, attrInspector, queryString;

        var mapUSALayer = new ArcGISDynamicMapServiceLayer(dynamicLayerUrl);

        var landusePointLayer = loadFeatureLayer(militaryLayerUrl + '6');
        var landusePolylineLayer = loadFeatureLayer(militaryLayerUrl + '8');
        var landusePolygonLayer = loadFeatureLayer(militaryLayerUrl + '9');

        var earthquakesFL = new FeatureLayer(earthquakesUrl, {
            mode: FeatureLayer.MODE_SNAPSHOT,
            outFields: ["datetime", 'depth', 'magnitude', 'longitude', 'region', 'latitude'],
            infoTemplate: new InfoTemplate("Земетресение #${objectid}", "${*}")
        });

        var statesUSATask = new QueryTask(statesUSATaskUrl);

        map.on("load", mapInit);
        map.on('update-end', mapUpdateEnd);
        map.on("layers-add-result", mapLayersAdd);
        map.on("click", mapClick);

        mapUSALayer.on('load', createLayerList);

        on(dom.byId("form-submit"), "click", searchObject);

        function createSearchQuery() {
            searchQuery = new Query();
            searchQuery.returnGeometry = false;
            searchQuery.outFields = [
                'ObjectID', 'SUB_REGION', 'POP2007'
            ];
        }

        function searchObject() {
            queryString = capitalizeWord(dom.byId('state-name').value);
            searchQuery.text = queryString;
            statesUSATask.execute(searchQuery, showResults);
        }

        function showResults(results) {
            var output = '';
            var resultCount = results.features.length;
            var i, featureAttributes, attr;

            if (resultCount === 0) {
                output = 'Няма открити съвпадения';
            }
            else {
                for (i = 0; i < resultCount; i++) {
                    featureAttributes = results.features[i].attributes;
                    for (attr in featureAttributes) {
                        output += "<b>" + attr + ":</b>  " + featureAttributes[attr] + "<br />";
                    }
                    output += "<br />";
                }
            }
            dialog.set('title', 'Резултат от търсенето за "' + queryString + '"');
            dialog.set("content", output);
            dialog.show();
        }

        function loadFeatureLayer(url) {
            return new FeatureLayer(url, {
                mode: FeatureLayer.MODE_SNAPSHOT,
                outFields: ["*"]
            });
        }

        function capitalizeWord(word) {
            return word.charAt(0).toUpperCase() + word.toLowerCase().substr(1)
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
                featureLayers: layers.slice(0, -1),
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

        function mapClick() {
            map.infoWindow.hide();
            editToolbar.deactivate();
            resetCursor();
            clearAreaSelection();
        }

        function clearAreaSelection() {
            earthquakesFL.clearSelection();
            map.graphics.clear();
            map.infoWindow.hide();
            dom.byId('selection-results').innerHTML = null;
        }

        function mapInit(evt) {
            map.addLayers([mapUSALayer, landusePointLayer, landusePolylineLayer, landusePolygonLayer, earthquakesFL]);
            var nullSymbol = new SimpleMarkerSymbol().setSize(0);
            earthquakesFL.setRenderer(new SimpleRenderer(nullSymbol));
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

            createDialog();
            createLegend(evt);
            createAttrInspector();
            createTemplatePicker();

            createSelectToolbar();
            createDrawToolbar();
            createEditToolbar();

            createFLSelectionSymbol();

            createSearchQuery();
            selectQuery = new Query();

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
                    currentLayer = this;
                    event.stop(evt);
                    if (evt.ctrlKey === true) {
                        deleteGraphic(evt.graphic);
                    }
                    else if (evt.shiftKey === true) {
                        showInfoWindow(evt.mapPoint, evt.screenPoint);
                    }
                });
            });
        }

        function createFLSelectionSymbol() {
            var symbol = new SimpleMarkerSymbol(
                SimpleMarkerSymbol.STYLE_CIRCLE,
                12,
                new SimpleLineSymbol(
                    SimpleLineSymbol.STYLE_NULL,
                    new Color([24, 34, 101, 0.9]),
                    1
                ),
                new Color([27, 34, 171, 0.5])
            );
            earthquakesFL.setSelectionSymbol(symbol);
        }

        function createDialog() {
            dialog = new Dialog({
                style: "width: 300px"
            });
        }


        function deleteGraphic(graphic) {
            var conf = confirm('Сигурни ли сте, че искате да изтриете този обект?');
            if (conf) {
                currentLayer.applyEdits(null, null, [graphic]);
            }
            editToolbar.deactivate();
            editingEnabled = false;
        }

        function showInfoWindow(mapPoint, screenPoint) {
            selectQuery.geometry = mapPoint;
            currentLayer.selectFeatures(selectQuery, FeatureLayer.SELECTION_NEW, function(features) {
                if (features.length > 0) {
                    updateFeature = features[0];
                    map.infoWindow.setTitle(features[0].getLayer().name);
                    map.infoWindow.show(screenPoint, map.getInfoWindowAnchor(screenPoint));
                }
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
            var items = arrayUtils.map(mapUSALayer.layerInfos, function(info, index) {
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
            mapUSALayer.setVisibleLayers(visible);
            on(layer_list, "click", updateLayerVisibility);
        }

        function createAttrInspector() {
            var layerInfos = [{
                'featureLayer': landusePolygonLayer,
                'showAttachments': false,
                'isEditable': true,
                'showDeleteButton': false
            }];

            attrInspector = new AttributeInspector({
                layerInfos: layerInfos
            }, domConstruct.create("div"));

            var saveButton = new Button({ label: "Save", "class": "saveButton"});

            domConstruct.place(saveButton.domNode, attrInspector.deleteBtn.domNode, "before");
            map.infoWindow.setContent(attrInspector.domNode);

            saveButton.on("click", saveFL);

            attrInspector.on("attribute-change", function(evt) {
                updateFeature.attributes[evt.fieldName] = evt.fieldValue;
            });
        }

        function saveFL() {
            updateFeature.getLayer().applyEdits(null, [updateFeature], null);
            map.infoWindow.hide();
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
            mapUSALayer.setVisibleLayers(visible);
        }

        function createDrawToolbar() {
            drawToolbar = new Draw(map, { showTooltips: false });
            drawToolbar.on('draw-end', createFLGraphic)
        }

        function createFLGraphic(evt) {
            drawToolbar.deactivate();
            var newAttributes = lang.mixin({}, selectedTemplate.template.prototype.attributes);
            var newGraphic = new Graphic(evt.geometry, null, newAttributes);
            selectedTemplate.featureLayer.applyEdits([newGraphic], null, null);
        }

        function createEditToolbar() {
            editToolbar = new Edit(map);
            editToolbar.on("deactivate", function(evt) {
                currentLayer.applyEdits(null, [evt.graphic], null);
            });
        }

        function createSelectToolbar() {
            selectToolbar = new Draw(map);
            selectToolbar.on('draw-end', selectAreaFL);
            var tools = query('.tool');
            arrayUtils.forEach(tools, function(tool) {
                on(tool, 'click', activateSelectTool);
            });
        }

        function selectAreaFL(evt) {
            var symbol = new SimpleFillSymbol(
                SimpleFillSymbol.STYLE_NULL,
                    new SimpleLineSymbol(
                        SimpleLineSymbol.STYLE_SOLID,
                        new Color([195, 105, 15]),
                        2
                    ),
                new Color([255, 255, 0, 0.25])
            );

            selectToolbar.deactivate();
            var graphic = new Graphic(evt.geometry, symbol);
            map.graphics.add(graphic);
            bufferArea = graphic.geometry;
            var selectAreaQuery = new Query();
            selectAreaQuery.geometry = bufferArea.getExtent();
            earthquakesFL.queryFeatures(selectAreaQuery, selectInBuffer);
        }

        function selectInBuffer(response) {
            var feature;
            var features = response.features;
            var inBuffer = [];

            for (var i = 0; i < features.length; i++) {
                feature = features[i];
                if (bufferArea.contains(feature.geometry)) {
                    inBuffer.push(feature.attributes[earthquakesFL.objectIdField]);
                }

            }

            var newQuery = new Query();

            newQuery.objectIds = inBuffer;

            earthquakesFL.selectFeatures(newQuery, FeatureLayer.SELECTION_NEW, function(results) {
                dom.byId('selection-results').innerHTML = 'Намерени резултати: ' + results.length;
            });
        }

        function activateSelectTool() {
            clearAreaSelection();
            var tool = this.value;
            selectToolbar.activate(Draw[tool]);
            selectToolbar._tooltip.innerText = 'Очертайте област, в която търсите земетресения';
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
