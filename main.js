/*jslint browser: true*/
/*global Tangram, gui */

var picking = false;
map = (function () {
// (function () {
    // 'use strict';

    var map_start_location = [40.7238, -73.9881, 14]; // NYC

    /*** URL parsing ***/

    // leaflet-style URL hash pattern:
    // #[zoom],[lat],[lng]
    var url_hash = window.location.hash.slice(1, window.location.hash.length).split('/');
    keytext = "kind";
    window.keytext = keytext;
    valuetext = "major_road";
    window.valuetext = valuetext;

    if (url_hash.length >= 3) {
        map_start_location = [url_hash[1],url_hash[2], url_hash[0]];
        // convert from strings
        map_start_location = map_start_location.map(Number);
    }

    if (url_hash.length == 5) {
        keytext = unescape(url_hash[3]);
        valuetext = unescape(url_hash[4]);
    }

    // Put current state on URL
    window.updateURL = function() {
        var map_latlng = map.getCenter();
        var url_options = [map.getZoom().toFixed(1), map_latlng.lat.toFixed(4), map_latlng.lng.toFixed(4), escape(keytext), escape(valuetext)];
        window.location.hash = url_options.join('/');
    }

    /*** Map ***/

    var map = L.map('map',
        {"keyboardZoomOffset" : .05}
    );

    var layer = Tangram.leafletLayer({
        scene: 'scene.yaml',
        attribution: '<a href="https://mapzen.com/tangram" target="_blank">Tangram</a> | &copy; OSM contributors | <a href="https://mapzen.com/" target="_blank">Mapzen</a>'
    });

    window.layer = layer;
    var scene = layer.scene;
    window.scene = scene;

    // setView expects format ([lat, long], zoom)
    map.setView(map_start_location.slice(0, 3), map_start_location[2]);
    map.on('moveend', updateURL);

    function updateKey(value) {
        keytext = value;
        scene.config.global.key_text = value;
        scene.rebuild();
        updateURL();
    }

    function updateValue(value) {
        valuetext = value;
        scene.config.global.value_text = value;
        scene.rebuild();
        updateURL();
    }

    function updateCollide(value) {
        scene.config.global.matching.points.draw.points.text.collide = value;
        scene.rebuild();
    }

    // Create dat GUI
    var gui = new dat.GUI({ autoPlace: true, hideable: false, width: 300 });
    function addGUI () {

        gui.domElement.parentNode.style.zIndex = 2000; // make sure GUI is on top of map
        window.gui = gui;

        gui.keyinput = keytext;
        var keyinput = gui.add(gui, 'keyinput').name("key").listen();

        gui.valueinput = valuetext;
        var valueinput = gui.add(gui, 'valueinput').name("value").listen();
        
        updateKey(keytext);
        updateValue(valuetext);
        keyinput.onChange(function(value) {
            updateKey(value);
        });
        valueinput.onChange(function(value) {
            updateValue(value);
        });

        gui.collide = true;
        var collide = gui.add(gui, 'collide').name("label collisions");

        collide.onChange(function(value) {
            updateCollide(value);
        });
        //select input text when you click on it
        keyinput.domElement.id = "keyfilter";
        keyinput.domElement.onclick = function() { this.getElementsByTagName('input')[0].select(); };
        valueinput.domElement.id = "valuefilter";
        valueinput.domElement.onclick = function() { this.getElementsByTagName('input')[0].select(); };

        // Link to edit in OSM - hold 'shift' and click
        map.on("click", function(e) {
            if (e.originalEvent.shiftKey) {
                var url = 'https://www.openstreetmap.org/edit?';
                if (scene.selection.feature && scene.selection.feature.id) {
                    url += 'way=' + scene.selection.feature.id;
                }
                if (scene.center) {
                    url += '#map=' + scene.baseZoom(scene.zoom) + '/' + scene.center.lat + '/' + scene.center.lng;
                }
                window.open(url, '_blank');
            }

            function long2tile(lon,zoom) { return (Math.floor((lon+180)/360*Math.pow(2,zoom))); }
            function lat2tile(lat,zoom)  { return (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom))); }

            if (e.originalEvent.ctrlKey || e.originalEvent.commandKey) {
                var url = 'https://tile.mapzen.com/mapzen/vector/v1/all/' + scene.tile_manager.view.zoom + '/' + long2tile(e.latlng.lng,scene.tile_manager.view.zoom)  + '/' + lat2tile(e.latlng.lat,scene.tile_manager.view.zoom) + '.topojson?api_key=mapzen-PvCT6iP';
                window.open(url, '_blank');
            }
        });
    }

    // Feature selection
    function initFeatureSelection () {
        // Selection info shown on hover
        var selection_info = document.createElement('div');
        selection_info.setAttribute('class', 'label');
        selection_info.style.display = 'block';
        selection_info.style.zindex = 1000;

        // Show selected feature on hover
        map.getContainer().addEventListener('mousemove', function (event) {
            if (picking) return;
            var pixel = { x: event.clientX, y: event.clientY };

            scene.getFeatureAt(pixel).then(function(selection) {    
                if (!selection) {
                    return;
                }
                var feature = selection.feature;
                if (feature != null) {

                    var label = '';
                    if (feature.properties != null) {
                        var sorted = [];
                        var count = 0;
                        Object.keys(feature.properties)
                            .sort()
                            .forEach(function(v, i) {
                                sorted.push([v, feature.properties[v]]);
                                count++;
                            });
                        label = "";
                        label += "layer : "+feature.layers+"<br>";

                        for (x in sorted) {
                            key = sorted[x][0]
                            val = sorted[x][1];
                            label += "<span class='labelLine' key='"+key+"' value='"+val+"' onclick='setValuesFromSpan(this)'>"+key+" : "+val+"</span><br>";
                        }
                    }

                    if (label != '') {
                        selection_info.style.left = (pixel.x + 5) + 'px';
                        selection_info.style.top = (pixel.y + 15) + 'px';
                        selection_info.innerHTML = '<span class="labelInner">' + label + '</span>';
                        map.getContainer().appendChild(selection_info);
                    }
                    else if (selection_info.parentNode != null) {
                        selection_info.parentNode.removeChild(selection_info);
                    }
                }
                else if (selection_info.parentNode != null) {
                    selection_info.parentNode.removeChild(selection_info);
                }
            });

            // Don't show labels while panning
            if (scene.panning == true) {
                if (selection_info.parentNode != null) {
                    selection_info.parentNode.removeChild(selection_info);
                }
            }
        });

        // toggle popup picking state
        map.getContainer().addEventListener('click', function (event) {
            picking = !picking;
        });
        // toggle popup picking state
        map.getContainer().addEventListener('drag', function (event) {
            picking = false;
        });
    }

    window.setValuesFromSpan = function(span) {
        keytext = span.getAttribute("key");
        valuetext = span.getAttribute("value");
        gui.keytext=span.getAttribute("key");
        gui.keyinput=span.getAttribute("key");
        gui.valuetext=span.getAttribute("value");
        gui.valueinput=span.getAttribute("value");
        updateKey(keytext);
        updateValue(valuetext);
        updateURL();
    }

    // Add map
    window.addEventListener('load', function () {
        // Scene initialized
        layer.on('init', function() {
            addGUI();
            var keyfilter = document.getElementById('keyfilter').getElementsByTagName('input')[0];
            if (keyfilter.value.length == 0) keyfilter.focus();
            else keyfilter.select();

            initFeatureSelection();
        });
        layer.addTo(map);
    });

    return map;

}());

