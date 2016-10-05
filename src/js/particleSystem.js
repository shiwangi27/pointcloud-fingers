"use strict";

/* Get or create the application global variable */
var App = App || {};

var ParticleSystem = function() {

    // setup the pointer to the scope 'this' variable
    var self = this;
    var slider;
    var brush;
    // data container
    var data = [];

    var colors; 
    var colorScale = {};

    // This is the THREE.js object that filters our points
    var rectFilter = {};

    // This is the data that our rect filter extracts, so we can paint something with it
    var filterData = [];

    // scene graph group for the particle system
    var sceneObject = new THREE.Group();
    var points;
    // bounds of the data
    var bounds = {};

    var shaderMaterial;

    var changeConc = true; 

    // create the containment box.
    // This cylinder is only to guide development.
    // TODO: Remove after the data has been rendered
    self.drawContainment = function() {

        // get the radius and height based on the data bounds
        var radius = (bounds.maxX - bounds.minX)/2.0;
        var height = (bounds.maxY - bounds.minY);

        // create a cylinder to contain the particle system
        var geometry = new THREE.CylinderGeometry( radius, radius, height, 32 );
        var material = new THREE.MeshBasicMaterial( {color: 0xffff00, wireframe: true} );
        var cylinder = new THREE.Mesh( geometry, material );

        // add the containment to the scene
        //sceneObject.add(cylinder);
    };

    // creates the particle system
    self.createParticleSystem = function() {

        var particles = data.length
        var geometry = new THREE.BufferGeometry();
        var positions = new Float32Array( particles * 3 );
        colors = new Float32Array( particles * 4 );
        var color = new THREE.Color();        
        var opacity = new Float32Array( particles );
        
        var extent = d3.extent(data.map(d => d.concentration))
        colorScale = d3.scaleLinear()
            .range([0,1])
            .domain(extent)

        console.log(extent);


        console.log("Z extent", d3.extent(data.map(d => d.Z)));
        // use data to create the particle system 
        for (var i = 0, j=0, k=0; 
            i < positions.length && 
            j < particles && 
            k < colors.length; 
            j++, i+=3, k+=4) {

            positions[ i ]     = data[j].X;
            positions[ i + 1 ] = data[j].Y;
            positions[ i + 2 ] = data[j].Z;

            var o = colorScale(data[j].concentration);
            // console.log(o);
            color.set( d3.interpolateViridis(o) );
            colors[ k ]     = color.r;
            colors[ k + 1 ] = color.g;
            colors[ k + 2 ] = color.b;
            colors[ k + 3 ] = o; 

            // opacity[j] = 1.0; //c+0.5; 
        }

        geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
        geometry.addAttribute( 'color', new THREE.BufferAttribute( colors, 4 ) );
        // geometry.addAttribute( 'opacity', new THREE.BufferAttribute( opacity, 1 ) );
        geometry.computeBoundingSphere();
        //
        var material = new THREE.PointsMaterial( { size: 10, vertexColors: THREE.VertexColors } );

        shaderMaterial = new THREE.RawShaderMaterial( {
                    uniforms: {
                        time: { value: 1.0 },
                        size: {type: "f", value: 1.5}

                    },

                    vertexShader: document.getElementById( 'vertexShader' ).textContent,
                    fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
                    side: THREE.DoubleSide,
                    transparent: true
                } );


        points = new THREE.Points( geometry, shaderMaterial );
        points.position.y = -5       
        points.rotation.x = self.degree2radians(-90);
        sceneObject.add( points );

    };

    self.degree2radians = function(degree){
        return degree * (Math.PI / 180); 
    };

    self.updateByConcentration = function(){
        brush = d3.select("input#brush"); 
        brush.on("click", _ => {
            for (var k = 0; k<colors.length ; k+=4){
                colors[k + 3] = 1; 
            }
        });
    };

    self.drawRectFilter = function(){
        slider = d3.select("input#z-slider"); 
        var width = (bounds.maxX - bounds.minX) + 1;
        var height = (bounds.maxY - bounds.minY) + 1; 
        console.log("BOUNDS", bounds.minY, bounds.maxX, width, height);

        var geometry = new THREE.BoxGeometry( width, height, 0.5 );
        var material = new THREE.MeshBasicMaterial( {color: 0x00cc00, wireframe: true, side: THREE.DoubleSide} );
        material.opacity = 0.2 
        rectFilter = new THREE.Mesh( geometry, material ); 
        
        rectFilter.position.z = slider.node().value;  // Range [-5, 5] 

        slider.on('change', _ => {
            rectFilter.position.z = slider.node().value;
            console.log("changes", rectFilter.position.z, rectFilter.position.z*1.10, slider.node().value);
            filterData = data.filter(d => d.Z < (rectFilter.position.z*1.10 ) && d.Z >= rectFilter.position.z)
            console.log("filterData", filterData.length); 
            self.update(filterData);
        })
        
        points.add( rectFilter ); 

    };

    var g;
    var slabwidth;
    var slabheight;

    self.drawSliceXY = function(){
        console.log(rectFilter.position.z);
        filterData = data.filter(d => d.Z < rectFilter.position.z*1.10 && d.Z >= rectFilter.position.z)
        console.log("filterData", filterData.length);

        slabwidth = d3.select('.sliceDiv').node().clientWidth;
        slabheight = slabwidth * 0.95; 
        
        // var xScale = d3.scaleLinear().range([0, slabwidth-20]).domain(d3.extent(filterData, d=> d.X = d.X ))
        // var yScale = d3.scaleLinear().range([0, slabheight]).domain(d3.extent(filterData, d=> d.Y = d.Y ))

        let svg = d3.select(".sliceDiv").append("svg")
            .attr("width", slabwidth)
            .attr("height", slabheight) 

        g = svg.append("g")
            .attr("class", "points")

        self.update(filterData);


    };

    self.update = function(filterData){
        // console.log("update", filterData);

        var xScale = d3.scaleLinear().range([0, slabwidth-20]).domain(d3.extent(filterData, d=> d.X = d.X ))
        var yScale = d3.scaleLinear().range([0, slabheight]).domain(d3.extent(filterData, d=> d.Y = d.Y ))


        let circles = g.selectAll(".salty") 
            .data([])

        circles.exit().remove() 

        // circles
        //       .attr('r', 1)
        //       .attr("cx", d => xScale(d.X))
        //       .attr("cy", d => yScale(d.Y))
        //       .style("fill", d => d3.interpolateViridis(colorScale(d.concentration)))
        //       // .style("opacity", d => colorScale(d.concentration))
      

        circles.data(filterData).enter()
            .append("circle")
            .attr('class', 'salty')
            .attr('r', 1)
            .attr("cx", d => xScale(d.X))
            .attr("cy", d => yScale(d.Y))
            .style("fill", d => d3.interpolateViridis(colorScale(d.concentration)))
            .style("opacity", d => colorScale(d.concentration))


    };


    // data loading function
    self.loadData = function(file){

        // read the csv file
        d3.csv(file)
        // iterate over the rows of the csv file
            .row(function(d) {

                // get the min bounds
                bounds.minX = Math.min(bounds.minX || Infinity, d.Points0);
                bounds.minY = Math.min(bounds.minY || Infinity, d.Points1);
                bounds.minZ = Math.min(bounds.minZ || Infinity, d.Points2);

                // get the max bounds
                bounds.maxX = Math.max(bounds.maxX || -Infinity, d.Points0);
                bounds.maxY = Math.max(bounds.maxY || -Infinity, d.Points1);
                bounds.maxZ = Math.max(bounds.maxY || -Infinity, d.Points2);

                // add the element to the data collection
                data.push({
                    // concentration density
                    concentration: Number(d.concentration),
                    // Position
                    X: Number(d.Points0),
                    Y: Number(d.Points1),
                    Z: Number(d.Points2),
                    // Velocity
                    U: Number(d.velocity0),
                    V: Number(d.velocity1),
                    W: Number(d.velocity2)
                });
            })
            // when done loading
            .get(function() {
                // draw the containment cylinder
                // TODO: Remove after the data has been rendered
                self.drawContainment();

                // create the particle system
                self.createParticleSystem();

                // Draw the Filter over the cylinder point cloud
                self.drawRectFilter();

                // Draw d3 view for XY slice
                self.drawSliceXY();

                //self.updateByConcentration();
            });
    };

    // publicly available functions
    var publiclyAvailable = {

        // load the data and setup the system
        initialize: function(file){
            self.loadData(file);
        },

        // accessor for the particle system
        getParticleSystems : function() {
            return sceneObject;
        }
    };

    return publiclyAvailable;

};