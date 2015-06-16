/*jslint browser: true*/
/*global Tangram, gui */

map = (function () {
    'use strict';

    var locations = {
        'Oakland': [37.8044, -122.2708, 15],
        'New York': [40.70531887544228, -74.00976419448853, 15],
        'Seattle': [47.5937, -122.3215, 15]
    };

    var map_start_location = locations['Oakland'];

    /*** URL parsing ***/

    // leaflet-style URL hash pattern:
    // #[zoom],[lat],[lng]
    var url_hash = window.location.hash.slice(1, window.location.hash.length).split('/');
    var keytext = "kind";
    var valuetext = "major_road";

    if (url_hash.length == 3) {
        map_start_location = [url_hash[1],url_hash[2], url_hash[0]];
        // convert from strings
        map_start_location = map_start_location.map(Number);
    }

    /*** Map ***/

    var map = L.map('map',
        {"keyboardZoomOffset" : .05}
    );

    var layer = Tangram.leafletLayer({
        scene: 'scene.yaml',
        numWorkers: 2,
        attribution: '<a href="https://mapzen.com/tangram" target="_blank">Tangram</a> | &copy; OSM contributors | <a href="https://mapzen.com/" target="_blank">Mapzen</a>',
        unloadInvisibleTiles: false,
        updateWhenIdle: false
    });

    window.layer = layer;
    var scene = layer.scene;
    window.scene = scene;

    // setView expects format ([lat, long], zoom)
    map.setView(map_start_location.slice(0, 3), map_start_location[2]);

    var hash = new L.Hash(map);

    // Create dat GUI
    var gui = new dat.GUI({ autoPlace: true, hideable: false, width: 300 });
    function addGUI () {

        gui.domElement.parentNode.style.zIndex = 5; // make sure GUI is on top of map
        window.gui = gui;

        gui.keyinput = keytext;
        var keyinput = gui.add(gui, 'keyinput').name("key");
        function updateKey(value) {
            keytext = value;
            if (value == "") value = "willdefinitelynotmatch";
            // scene.config.layers["earth"].properties.key_text = value;
            // scene.config.layers["water"].properties.key_text = value;
            scene.config.layers["landuse"].properties.key_text = value;
            scene.config.layers["roads"].properties.key_text = value;
            scene.config.layers["buildings"].properties.key_text = value;
            // scene.config.layers["places"].properties.key_text = value;
            scene.rebuildGeometry();
            scene.requestRedraw();
            //updateURL(); 
            console.log('value now:', scene.config.layers["roads"].properties.key_text);
            console.log('updatekey done');
        }

        gui.valueinput = valuetext;
        var valueinput = gui.add(gui, 'valueinput').name("value");
        function updateValue(value) {
            valuetext = value;
            if (value == "") value = "willdefinitelynotmatch";
            // scene.config.layers["earth"].properties.value_text = value;
            // scene.config.layers["water"].properties.value_text = value;
            scene.config.layers["landuse"].properties.value_text = value;
            scene.config.layers["roads"].properties.value_text = value;
            scene.config.layers["buildings"].properties.value_text = value;
            // scene.config.layers["places"].properties.value_text = value;
            scene.rebuildGeometry();
            scene.requestRedraw();
            //updateURL();            
            console.log('updatevalue done');
        }
        updateKey(keytext);
        updateValue(valuetext);
        keyinput.onChange(function(value) {
            updateKey(value);
        });
        valueinput.onChange(function(value) {
            updateValue(value);
        });
        //select input text when you click on it
        keyinput.domElement.id = "keyfilter";
        keyinput.domElement.onclick = function() { this.getElementsByTagName('input')[0].select(); };
        console.log(valueinput);
        valueinput.domElement.id = "valuefilter";
        valueinput.domElement.onclick = function() { this.getElementsByTagName('input')[0].select(); };
    }

    // Add map
    window.addEventListener('load', function () {
        // Scene initialized
        layer.on('init', function() {
            addGUI();
            var keyfilter = document.getElementById('keyfilter').getElementsByTagName('input')[0];
            if (keyfilter.value.length == 0) keyfilter.focus();
            else keyfilter.select();
        });
        layer.addTo(map);
    });

    return map;

}());

