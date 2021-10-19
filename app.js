(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
glsl = require("glslify");

var VSHADER_SOURCE = glsl(["#define GLSLIFY 1\nattribute vec4 a_Position;\n  attribute vec4 a_Color;\n  uniform mat4 u_MvpMatrix;\n  uniform mat4 u_ModelMatrix;\n  varying vec4 v_Color;\n  void main() {\n    gl_Position = u_MvpMatrix * u_ModelMatrix * a_Position;\n    v_Color = a_Color;\n  }"]);
var FSHADER_SOURCE = glsl(["#ifdef GL_ES\n  precision mediump float;\n#define GLSLIFY 1\n\n  #endif\n  varying vec4 v_Color;\n  void main() {\n    gl_FragColor = v_Color;\n  }"]);

var ANGLE_STEP = [45.0, 45.0, 45.0, 45.0, 45.0, 45.0, 45.0, 45.0];
var masterSpeed = 1.0;
const armSpeeds = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0];
var eyeAngle = 0;

//controls movement of head
var headScale = 1.0;
var headScaleStep = 0.1;

//globals to control animation of pufferfish
var bodyScale = 1.0;
var bodyScaleStep = 0.0;
var puffed = false;

var finAngle = 0;
var finAngleStep = 45;

var puffButton = document.getElementById("puffer");
puffButton.addEventListener("click", () =>{
  puffed = !puffed;
  bodyScaleStep = puffed ? 1 : -1;
  finAngleStep = puffed ? 10 : 45;
});

//Access HTML slider elements and associate them with the appropriate global variables
var speedSlider = document.getElementById("masterSpeedController")
speedSlider.oninput = function() {
  masterSpeed = parseFloat(this.value)/100
}

var arm0Slider = document.getElementById("arm0Controller")
arm0Slider.oninput = function() {
  armSpeeds[0] = parseFloat(this.value)/100
}
var arm1Slider = document.getElementById("arm1Controller")
arm1Slider.oninput = function() {
  armSpeeds[1] = parseFloat(this.value)/100
}
var arm2Slider = document.getElementById("arm2Controller")
arm2Slider.oninput = function() {
  armSpeeds[2] = parseFloat(this.value)/100
}
var arm3Slider = document.getElementById("arm3Controller")
arm3Slider.oninput = function() {
  armSpeeds[3] = parseFloat(this.value)/100
}
var arm4Slider = document.getElementById("arm4Controller")
arm4Slider.oninput = function() {
  armSpeeds[4] = parseFloat(this.value)/100
}
var arm5Slider = document.getElementById("arm5Controller")
arm5Slider.oninput = function() {
  armSpeeds[5] = parseFloat(this.value)/100
}
var arm6Slider = document.getElementById("arm6Controller")
arm6Slider.oninput = function() {
  armSpeeds[0] = parseFloat(this.value)/100
}
var arm7Slider = document.getElementById("arm7Controller")
arm7Slider.oninput = function() {
  armSpeeds[0] = parseFloat(this.value)/100
}

//globals for handling mouse drag
var g_isDrag=false;		// mouse-drag: true when user holds down mouse button
var g_xMclik=0.0;			// last mouse button-down position (in CVV coords)
var g_yMclik=0.0;   

function main() {
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // Set the vertex coordinates and color
  var n = initVertexBuffers(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  // Set clear color and enable hidden surface removal
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  // Get the storage location of u_MvpMatrix
  var u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
  if (!u_MvpMatrix) { 
    console.log('Failed to get the storage location of u_MvpMatrix');
    return;
  }

  //CAMERA CONTROLS
  canvas.addEventListener("mousedown", (ev) => {
    var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
    var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
    var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
//  console.log('myMouseDown(pixel coords): xp,yp=\t',xp,',\t',yp);
  
	// Convert to Canonical View Volume (CVV) coordinates too:
    var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
  						  (canvas.width/2);			// normalize canvas to -1 <= x < +1,
	  var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
							  (canvas.height/2);
	
	  g_isDrag = true;											// set our mouse-dragging flag
	  g_xMclik = x;													// record where mouse-dragging began
	  g_yMclik = y;
  }); 
	// (After each 'mousedown' event, browser calls the myMouseDown() fcn.)
  canvas.addEventListener("mousemove", (ev) => {
    if(g_isDrag==false) return;				// IGNORE all mouse-moves except 'dragging'

	// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
    var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
    var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
	  var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
    var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
  						 (canvas.width/2);		// normalize canvas to -1 <= x < +1,
	  var y = (yp - canvas.height/2) /		//									-1 <= y < +1.
							 (canvas.height/2);
    eyeAngle+= (x-g_xMclik)*100;
	// find how far we dragged the mouse:

	  g_xMclik = x;											// Make next drag-measurement from here.
	  g_yMclik = y;

  var mvpMatrix = new Matrix4();
  mvpMatrix.setPerspective(30, 1, 1, 100);
  mvpMatrix.lookAt(15*Math.cos(Math.PI*eyeAngle/180), 3, 15*Math.sin(Math.PI*eyeAngle/180), 0, 0, 0, 0, 1, 0);
  //mvpMatrix.lookAt(5, -5, 0, 0, 0, 0, 0, 0, 1);

  // Pass the model view projection matrix to u_MvpMatrix
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
  }); 
	canvas.addEventListener("mouseup", (ev) => {
    var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
    var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
	  var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
  
	// Convert to Canonical View Volume (CVV) coordinates too:
    var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
  						 (canvas.width/2);			// normalize canvas to -1 <= x < +1,
	  var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
							 (canvas.height/2);
	
	  g_isDrag = false;											
  });	

  // Set the eye point and the viewing volume
  var mvpMatrix = new Matrix4();
  mvpMatrix.setPerspective(30, 1, 1, 100);
  mvpMatrix.lookAt(15*Math.cos(Math.PI*eyeAngle/180), 3, 15*Math.sin(Math.PI*eyeAngle/180), 0, 0, 0, 0, 1, 0);
  //mvpMatrix.lookAt(5, -5, 0, 0, 0, 0, 0, 0, 1);

  // Pass the model view projection matrix to u_MvpMatrix
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) { 
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }

  //array of length 8. Tracks the angle of each arm separately
  var currentAngles = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
  // Model matrix
  var modelMatrix = new Matrix4();

  // Start drawing
  var tick = function() {
    currentAngles = animate(currentAngles).slice(0);  // Update the rotation angle
    drawArms(gl, n, currentAngles, modelMatrix, u_ModelMatrix);
    drawHead(gl, n, headScale, modelMatrix, u_ModelMatrix);
    drawPuffer(gl, n, bodyScale, modelMatrix, u_ModelMatrix);
    requestAnimationFrame(tick, canvas);   // Request that the browser ?calls tick
  };
  tick();
}

function initVertexBuffers(gl) {
  var verticesColors = new Float32Array(210);

  //arm segment
  for(i = 0; i < 36; i+=6){
    verticesColors[i] = 0.4*Math.cos(Math.PI * i/18)//x coord
    verticesColors[i+1] = 1.0 //y coord
    verticesColors[i+2] = 0.4*-Math.sin(Math.PI * i/18) //z coord
    verticesColors[i+3] = 153/255+i/360//R
    verticesColors[i+4] = 50/255+i/360//G
    verticesColors[i+5] = 204/255+i/360//B
    //verticesColors[i+3] = (Math.sin(i*10000))%1.0//R
    //verticesColors[i+4] = (Math.cos(i*10000)*43758.5453)%1.0//G
    //verticesColors[i+5] = (Math.cos(i*10000)*12.9898)%1.0//B
  }
  for(i = 36; i < 72; i+=6){
    verticesColors[i] = 0.3*Math.cos(Math.PI * i/18) //x coord
    verticesColors[i+1] = -1.0//y coord
    verticesColors[i+2] = 0.3*-Math.sin(Math.PI * i/18) //z coord
    verticesColors[i+3] = 153/255+i/360//R
    verticesColors[i+4] = 50/255+i/360//G
    verticesColors[i+5] = 204/255+i/360//B
    //verticesColors[i+3] = (Math.sin(i*10000))%1.0//R
    //verticesColors[i+4] = (Math.cos(i*10000)*43758.5453)%1.0//G
    //verticesColors[i+5] = (Math.cos(i*10000)*12.9898)%1.0//B
  }

  //head segment
  for(i = 72; i < 132; i+=6){
    verticesColors[i] = Math.cos(Math.PI * (i-72)/30)//x coord
    verticesColors[i+1] = 1.0 //y coord
    verticesColors[i+2] = -Math.sin(Math.PI * (i-72)/30) //z coord
    verticesColors[i+3] = 153/255+(i-72)/600//R
    verticesColors[i+4] = 50/255+(i-72)/600//G
    verticesColors[i+5] = 204/255+(i-72)/600//B
    //verticesColors[i+3] = (Math.sin(i*10000))%1.0//R
    //verticesColors[i+4] = (Math.cos(i*10000)*43758.5453)%1.0//G
    //verticesColors[i+5] = (Math.cos(i*10000)*12.9898)%1.0//B
  }
  for(i = 132; i < 192; i+=6){
    verticesColors[i] = 0.9*Math.cos(Math.PI * (i-72)/30)//x coord
    verticesColors[i+1] = -1.0 //y coord
    verticesColors[i+2] = -0.9*Math.sin(Math.PI * (i-72)/30) //z coord
    verticesColors[i+3] = 153/255+(i-72)/600//R
    verticesColors[i+4] = 50/255+(i-72)/600//G
    verticesColors[i+5] = 204/255+(i-72)/600//B
    //verticesColors[i+3] = (Math.sin(i*10000))%1.0//R
    //verticesColors[i+4] = (Math.cos(i*10000)*43758.5453)%1.0//G
    //verticesColors[i+5] = (Math.cos(i*10000)*12.9898)%1.0//B
  }
  for(i = 192; i < 210; i +=6) {
    verticesColors[i] = 0.5*Math.cos(Math.PI * (i-192)/9)-0.5//x coord
    verticesColors[i+1] = Math.sin(Math.PI * (i-192)/9) //y coord
    verticesColors[i+2] = 0 //z coord
    verticesColors[i+3] = 153/255+(i-72)/600//R
    verticesColors[i+4] = 50/255+(i-72)/600//G
    verticesColors[i+5] = 204/255+(i-72)/600//B
  }
  // Indices of the vertices
  var indices = new Uint8Array([
    0, 11, 6,     0, 6, 7,    // sides of arm segment
    0, 7, 1,      1, 7, 8,    
    1, 8, 2,      2, 8, 9,    
    2, 9, 3,      3, 9, 10,    
    3, 10, 4,     4, 10, 11,    
    4, 11, 5,     5, 11, 0,
    0, 1, 2,      2, 3, 0,    //top of arm segment
    3, 4, 0,      4, 5, 0,
    6, 7, 8,      8, 9, 6,    //bottom of arm segment
    9, 10, 6,     10, 11, 6,   
    12, 22, 23,   12, 23, 13,    // sides of head segment
    13, 23, 24,   13, 24, 14,    
    14, 24, 25,   14, 25, 15,    
    15, 25, 26,   15, 26, 16,    
    16, 26, 27,   16, 27, 17,    
    17, 27, 28,   17, 28, 18,
    18, 28, 29,   18, 29, 19,    
    19, 29, 30,   19, 30, 20,
    20, 30, 31,   20, 31, 21,    
    21, 31, 22,   21, 22, 12,
    12, 13, 14,   12, 14, 15,   // top of head segment
    12, 15, 16,   12, 16, 17,
    12, 17, 18,   12, 18, 19,
    12, 19, 20,   12, 20, 21,   
    22, 23, 24,   22, 24, 25,   // bottom of head segment
    22, 25, 26,   22, 26, 27,
    22, 27, 28,   22, 28, 29,
    22, 29, 30,   22, 30, 31,
    32, 33, 34,   34, 33, 32,   // front and back of triangle for fin
    32, 22, 23,   32, 23, 24,   // conical piece for top and bottom of head
    32, 24, 25,   32, 25, 26,
    32, 26, 27,   32, 27, 28,
    32, 28, 29,   32, 29, 30,
    32, 30, 31,   32, 31, 22
 ]);

  // Create a buffer object
  var vertexColorBuffer = gl.createBuffer();
  var indexBuffer = gl.createBuffer();
  if (!vertexColorBuffer || !indexBuffer) {
    return -1;
  }

  // Write the vertex coordinates and color to the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, verticesColors, gl.STATIC_DRAW);

  var FSIZE = verticesColors.BYTES_PER_ELEMENT;
  // Assign the buffer object to a_Position and enable the assignment
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if(a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 6, 0);
  gl.enableVertexAttribArray(a_Position);
  // Assign the buffer object to a_Color and enable the assignment
  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
  }
  gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE * 6, FSIZE * 3);
  gl.enableVertexAttribArray(a_Color);

  // Write the indices to the buffer object
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  return indices.length;
}

function drawArms(gl, n, currentAngles, modelMatrix, u_ModelMatrix) {
  //==============================================================================
    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT);
    //draw body using layers of stacked prisms
    for(i = 0; i < 8; i++) {
      //start first arm segment
      modelMatrix.setTranslate(0.0,-1.0+headScale, 0.0);

      modelMatrix.rotate(45*i, 0, 1, 0);

      modelMatrix.translate(-0.4, 0, 0);

      modelMatrix.scale(0.4, 0.4, 0.4);

      modelMatrix.rotate(currentAngles[i], 0, 0, 1);

      modelMatrix.translate(0.0, -1.0 ,0.0);		

      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

      gl.drawElements(gl.TRIANGLES, 60, gl.UNSIGNED_BYTE, 0);

      //start second arm segment
      modelMatrix.translate(0.0, -0.9, 0);

      modelMatrix.scale(0.75, 0.75, 0.75);

      modelMatrix.rotate(-currentAngles[i]*0.3, 0,0,1);

      modelMatrix.translate(0.0, -1.0, 0);

      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

      gl.drawElements(gl.TRIANGLES, 60, gl.UNSIGNED_BYTE, 0);

      //start third arm segment
      modelMatrix.translate(0.0, -0.9, 0);

      modelMatrix.scale(0.75, 0.75, 0.75);

      modelMatrix.rotate(-currentAngles[i]*0.5, 0, 0, 1);

      modelMatrix.translate(0.0, -1.0, 0);

      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

      gl.drawElements(gl.TRIANGLES, 60, gl.UNSIGNED_BYTE, 0);

      //start fourth arm segment
      modelMatrix.translate(0.0, -0.9, 0);

      modelMatrix.scale(0.75, 0.75, 0.75);

      modelMatrix.rotate(-currentAngles[i]*0.3, 0, 0, 1);

      modelMatrix.translate(0.0, -1.0, 0);

      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

      gl.drawElements(gl.TRIANGLES, 60, gl.UNSIGNED_BYTE, 0);

      //fifth and final arm segment
      modelMatrix.translate(0.0, -0.9, 0);

      modelMatrix.scale(0.75, 0.75, 0.75);

      modelMatrix.rotate(currentAngles[i]*0.1, 0, 0, 1);

      modelMatrix.translate(0.0, -1.0, 0);

      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

      gl.drawElements(gl.TRIANGLES, 60, gl.UNSIGNED_BYTE, 0);
    }
}

function drawHead(gl, n, headScale, modelMatrix, u_ModelMatrix) {
  //cone for bottom of sphere
  modelMatrix.setTranslate(0.0, -0.1+headScale, 0.0);

  modelMatrix.scale(0.5/headScale, -0.1*headScale, 0.5/headScale);

  modelMatrix.translate(0, 10, 0);

  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

  gl.drawElements(gl.TRIANGLES, 30, gl.UNSIGNED_BYTE, 174)
  //start drawing head by stacking prisms
  modelMatrix.scale(1/0.7, -10, 1/0.7);
  modelMatrix.translate(0.0, .15, 0.0);

  modelMatrix.scale(1, 0.085, 1);

  modelMatrix.translate(0.0, 0.5, 0.0);

  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

  gl.drawElements(gl.TRIANGLES, 108, gl.UNSIGNED_BYTE, 60);

  modelMatrix.scale(1.1, 1.0, 1.1);

  modelMatrix.translate(0.0, 1.0, 0.0);

  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

  gl.drawElements(gl.TRIANGLES, 108, gl.UNSIGNED_BYTE, 60);

  modelMatrix.scale(1.05, 1.0, 1.05);

  modelMatrix.translate(0.0, 1.0, 0.0);

  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

  gl.drawElements(gl.TRIANGLES, 108, gl.UNSIGNED_BYTE, 60);

  modelMatrix.scale(1.08, 3.0, 1.08);

  modelMatrix.translate(0.0, 1.0, 0.0);

  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

  gl.drawElements(gl.TRIANGLES, 108, gl.UNSIGNED_BYTE, 60);

  modelMatrix.scale(1.00, -1.0, 1.00);

  modelMatrix.translate(0.0, -2.0, 0.0);

  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

  gl.drawElements(gl.TRIANGLES, 108, gl.UNSIGNED_BYTE, 60);

  modelMatrix.scale(0.95, 0.333, 0.95);

  modelMatrix.translate(0.0, -2.0, 0.0);

  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

  gl.drawElements(gl.TRIANGLES, n-66, gl.UNSIGNED_BYTE, 60);

  modelMatrix.scale(0.95, 1.0, 0.95);

  modelMatrix.translate(0.0, -2.0, 0.0);

  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

  gl.drawElements(gl.TRIANGLES, 108, gl.UNSIGNED_BYTE, 60);

  modelMatrix.scale(0.90, 1.0, 0.90);

  modelMatrix.translate(0.0, -2.0, 0.0);

  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

  gl.drawElements(gl.TRIANGLES, 108, gl.UNSIGNED_BYTE, 60);

  //cone for top of sphere
  modelMatrix.scale(1, -1, 1);

  modelMatrix.translate(0, 2, 0);

  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

  gl.drawElements(gl.TRIANGLES, 30, gl.UNSIGNED_BYTE, 174)
}

function drawPuffer(gl, n, bodyScale, modelMatrix, u_ModelMatrix) {
  modelMatrix.setTranslate(-2, 0, -2);

  pushMatrix(modelMatrix);
  //cone for bottom of sphere
    modelMatrix.rotate(90, 0, 0, 1);

    modelMatrix.scale(0.4*bodyScale, -0.1, 0.4*bodyScale);

    modelMatrix.translate(0, 10, 0);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

    gl.drawElements(gl.TRIANGLES, 30, gl.UNSIGNED_BYTE, 174)
  //start drawing head by stacking prisms
    modelMatrix.scale(1, -10, 1);
    modelMatrix.translate(0.0, .15, 0.0);

    modelMatrix.scale(1, 0.085, 1);

    modelMatrix.translate(0.0, 0.5, 0.0);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

    gl.drawElements(gl.TRIANGLES, 108, gl.UNSIGNED_BYTE, 60);

    modelMatrix.scale(1.1, 1.0, 1.1);

    modelMatrix.translate(0.0, 1.0, 0.0);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

    gl.drawElements(gl.TRIANGLES, 108, gl.UNSIGNED_BYTE, 60);

    modelMatrix.scale(1.05, 1.0, 1.05);

    modelMatrix.translate(0.0, 1.0, 0.0);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

    gl.drawElements(gl.TRIANGLES, 108, gl.UNSIGNED_BYTE, 60);

    modelMatrix.scale(1.08, 3.0, 1.08);

    modelMatrix.translate(0.0, 1.0, 0.0);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

    gl.drawElements(gl.TRIANGLES, 108, gl.UNSIGNED_BYTE, 60);

    modelMatrix.scale(1.00, -1.0, 1.00);

    modelMatrix.translate(0.0, -2.0, 0.0);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

    gl.drawElements(gl.TRIANGLES, 108, gl.UNSIGNED_BYTE, 60);

    modelMatrix.scale(0.95, 0.333, 0.95);

    modelMatrix.translate(0.0, -2.0, 0.0);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

    gl.drawElements(gl.TRIANGLES, n-66, gl.UNSIGNED_BYTE, 60);

    modelMatrix.scale(0.95, 1.0, 0.95);

    modelMatrix.translate(0.0, -2.0, 0.0);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

    gl.drawElements(gl.TRIANGLES, 108, gl.UNSIGNED_BYTE, 60);

    modelMatrix.scale(0.90, 1.0, 0.90);

    modelMatrix.translate(0.0, -2.0, 0.0);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

    gl.drawElements(gl.TRIANGLES, 108, gl.UNSIGNED_BYTE, 60);

  //cone for top of sphere
    modelMatrix.scale(1, -1, 1);

    modelMatrix.translate(0, 2, 0);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

    gl.drawElements(gl.TRIANGLES, 30, gl.UNSIGNED_BYTE, 174);

  modelMatrix = popMatrix();
  //start drawing fins

  modelMatrix.scale(-0.5, 0.5, 0.5)

  pushMatrix(modelMatrix);

    modelMatrix.translate(-2, 0, 0);

    modelMatrix.rotate(finAngle, 0, 1, 0);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_BYTE, 168)

  modelMatrix = popMatrix();

  pushMatrix(modelMatrix);

    modelMatrix.rotate(90, 0, 1, 0);

    modelMatrix.translate(-bodyScale, 0, 0);

    modelMatrix.rotate(finAngle, 0, 1, 0);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_BYTE, 168)

  modelMatrix = popMatrix();

  pushMatrix(modelMatrix);

    modelMatrix.rotate(-90, 0, 1, 0);

    modelMatrix.translate(-bodyScale, 0, 0);

    modelMatrix.rotate(-finAngle, 0, 1, 0);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_BYTE, 168)

  modelMatrix = popMatrix();
}

var g_last = Date.now();

function animate(angles) {
//==============================================================================
  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - g_last;
  g_last = now;
  for(i = 0; i < 8; i++) {
  // Update the current rotation angle (adjusted by the elapsed time)
    if(angles[i] >   5.0 && ANGLE_STEP[i] > 0) ANGLE_STEP[i] = -ANGLE_STEP[i];
    if(angles[i] <  -105.0 && ANGLE_STEP[i] < 0) ANGLE_STEP[i] = -ANGLE_STEP[i];
  
    var newAngle = angles[i] + masterSpeed*armSpeeds[i]*(ANGLE_STEP[i] * elapsed) / 1000.0;
    angles[i] = newAngle %= 360;
  }
  if(headScale > 1.2 && headScaleStep > 0) headScaleStep = -headScaleStep;
  if(headScale < 1.0 && headScaleStep < 0) headScaleStep = -headScaleStep;
  headScale += masterSpeed * headScaleStep * elapsed/1000.0;
  if(bodyScale > 2.0 && bodyScaleStep > 0) {
    if(puffed) {
      bodyScaleStep = 0;
    }
    else {
      bodyScaleStep = -1;
    }
  }
  if(bodyScale < 1.0 && bodyScaleStep < 0)  {
    if(!puffed) {
      bodyScaleStep = 0;
    }
    else{
      bodyScaleStep = 1;
    }
  }
  bodyScale += masterSpeed * bodyScaleStep * elapsed/1000.0;

  if(finAngle >   45.0 && finAngleStep > 0) finAngleStep = -finAngleStep;
  if(finAngle <  -45.0 && finAngleStep < 0) finAngleStep = -finAngleStep;
  finAngle = (finAngle+finAngleStep*elapsed/1000) %360;
  return angles
}
    
main();
},{"glslify":2}],2:[function(require,module,exports){
module.exports = function(strings) {
  if (typeof strings === 'string') strings = [strings]
  var exprs = [].slice.call(arguments,1)
  var parts = []
  for (var i = 0; i < strings.length-1; i++) {
    parts.push(strings[i], exprs[i] || '')
  }
  parts.push(strings[i])
  return parts.join('')
}

},{}]},{},[1]);
