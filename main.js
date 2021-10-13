glsl = require("glslify");

var VSHADER_SOURCE = glsl.file("./shaders/vertexShader.vert");
var FSHADER_SOURCE = glsl.file("./shaders/fragmentShader.frag");

var ANGLE_STEP = [45.0, 45.0, 45.0, 45.0, 45.0, 45.0, 45.0, 45.0];
var masterSpeed = 1.0;
const armSpeeds = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0];
var eyeAngle = 240.0;
var headScale = 1.0;
var headScaleStep = 0.1;

const randomGradient = [0.0, 0.0, 0.0]

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
  var n = initArmVertexBuffers(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information for arms');
    return;
  }
  var m = initHeadVertexBuffers(gl);
  if(m < 0) {
    console.log("Failed to set vertex information for head")
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

  // Set the eye point and the viewing volume
  var mvpMatrix = new Matrix4();
  mvpMatrix.setPerspective(30, 1, 1, 100);
  mvpMatrix.lookAt(10*Math.cos(eyeAngle), 3, 10*Math.sin(eyeAngle), 0, 0, 0, 0, 1, 0);

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
    initArmVertexBuffers(gl);
    currentAngles = animate(currentAngles).slice(0);  // Update the rotation angle
    drawArms(gl, n, currentAngles, modelMatrix, u_ModelMatrix);
    initHeadVertexBuffers(gl);
    drawHead(gl, m, headScale, modelMatrix, u_ModelMatrix);
    requestAnimationFrame(tick, canvas);   // Request that the browser ?calls tick
  };
  tick();
}

function initArmVertexBuffers(gl) {
  var verticesColors = new Float32Array(72);
  for(i = 0; i < 36; i+=6){
    verticesColors[i] = 0.4*Math.cos(Math.PI * i/18)//x coord
    verticesColors[i+1] = 1.0 //y coord
    verticesColors[i+2] = 0.4*-Math.sin(Math.PI * i/18) //z coord
    verticesColors[i+3] = 153/255+i/360+randomGradient[0]//R
    verticesColors[i+4] = 50/255+i/360+randomGradient[1]//G
    verticesColors[i+5] = 204/255+i/360+randomGradient[2]//B
  }
  for(i = 36; i < 72; i+=6){
    verticesColors[i] = 0.3*Math.cos(Math.PI * i/18) //x coord
    verticesColors[i+1] = -1.0//y coord
    verticesColors[i+2] = 0.3*-Math.sin(Math.PI * i/18) //z coord
    verticesColors[i+3] = 153/255+i/360+randomGradient[0]//R
    verticesColors[i+4] = 50/255+i/360+randomGradient[1]//G
    verticesColors[i+5] = 204/255+i/360+randomGradient[2]//B
  }

  // Indices of the vertices
  var indices = new Uint8Array([
    0, 11, 6,   0, 6, 7,    // sides
    0, 7, 1,   1, 7, 8,    
    1, 8, 2,   2, 8, 9,    
    2, 9, 3,   3, 9, 10,    
    3, 10, 4,   4, 10, 11,    
    4, 11, 5,   5, 11, 0,
    0, 1, 2,    2, 3, 0,    //top
    3, 4, 0,    4, 5, 0,
    6, 7, 8,    8, 9, 6,    //bottom
    9, 10, 6,    10, 11, 6     
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

function initHeadVertexBuffers(gl) {
  var verticesColors = new Float32Array(120);
  for(i = 0; i < 60; i+=6){
    verticesColors[i] = Math.cos(Math.PI * i/30)//x coord
    verticesColors[i+1] = 1.0 //y coord
    verticesColors[i+2] = -Math.sin(Math.PI * i/30) //z coord
    verticesColors[i+3] = 153/255+i/600+randomGradient[0]//R
    verticesColors[i+4] = 50/255+i/600+randomGradient[1]//G
    verticesColors[i+5] = 204/255+i/600+randomGradient[2]//B
  }
  for(i = 60; i < 120; i+=6){
    verticesColors[i] = 0.9*Math.cos(Math.PI * i/30)//x coord
    verticesColors[i+1] = -1.0 //y coord
    verticesColors[i+2] = -0.9*Math.sin(Math.PI * i/30) //z coord
    verticesColors[i+3] = 153/255+i/600+randomGradient[0]//R
    verticesColors[i+4] = 50/255+i/600+randomGradient[1]//G
    verticesColors[i+5] = 204/255+i/600+randomGradient[2]//B
  }
  // Indices of the vertices
  var indices = new Uint8Array([
    0, 10, 11,   0, 11, 1,    // sides
    1, 11, 12,   1, 12, 2,    
    2, 12, 13,   2, 13, 3,    
    3, 13, 14,   3, 14, 4,    
    4, 14, 15,   4, 15, 5,    
    5, 15, 16,   5, 16, 6,
    6, 16, 17,    6, 17, 7,    
    7, 17, 18,    7, 18, 8,
    8, 18, 19,    8, 19, 9,    
    9, 19, 10,    9, 10, 0,
    0, 1, 2,      0, 2, 3,   // top
    0, 3, 4,      0, 4, 5,
    0, 5, 6,      0, 6, 7,
    0, 7, 8,      0, 8, 9,   // bottom
    10, 11, 12,   10, 12, 13,
    10, 13, 14,   10, 14, 15,
    10, 15, 16,   10, 16, 17,
    10, 17, 18,   10, 18, 19
 ]);

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
      modelMatrix.setTranslate(0.0,-0.4, 0.0);

      modelMatrix.rotate(45*i, 0, 1, 0);

      modelMatrix.translate(-0.4, 0, 0);

      modelMatrix.scale(0.4, 0.4, 0.4);

      modelMatrix.rotate(currentAngles[i], 0, 0, 1);

      modelMatrix.translate(0.0, -1.0 ,0.0);		

      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

      gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);

      //start second arm segment
      modelMatrix.translate(0.0, -0.9, 0);

      modelMatrix.scale(0.75, 0.75, 0.75);

      modelMatrix.rotate(-currentAngles[i]*0.3, 0,0,1);

      modelMatrix.translate(0.0, -1.0, 0);

      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

      gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);

      //start third arm segment
      modelMatrix.translate(0.0, -0.9, 0);

      modelMatrix.scale(0.75, 0.75, 0.75);

      modelMatrix.rotate(-currentAngles[i]*0.5, 0, 0, 1);

      modelMatrix.translate(0.0, -1.0, 0);

      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

      gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);

      //start fourth arm segment
      modelMatrix.translate(0.0, -0.9, 0);

      modelMatrix.scale(0.75, 0.75, 0.75);

      modelMatrix.rotate(-currentAngles[i]*0.3, 0, 0, 1);

      modelMatrix.translate(0.0, -1.0, 0);

      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

      gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);

      //fifth and final arm segment
      modelMatrix.translate(0.0, -0.9, 0);

      modelMatrix.scale(0.75, 0.75, 0.75);

      modelMatrix.rotate(currentAngles[i]*0.1, 0, 0, 1);

      modelMatrix.translate(0.0, -1.0, 0);

      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

      gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
    }
}

function drawHead(gl, m, headScale, modelMatrix, u_ModelMatrix) {
  //start drawing head by stacking prisms
  modelMatrix.setTranslate(0.0, -0.28, 0.0);

  modelMatrix.scale(0.77/headScale, 0.085*headScale, 0.77/headScale);

  modelMatrix.translate(0.0, 0.5, 0.0);

  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

  gl.drawElements(gl.TRIANGLES, m, gl.UNSIGNED_BYTE, 0);

  modelMatrix.scale(1.1, 1.0, 1.1);

  modelMatrix.translate(0.0, 1.0, 0.0);

  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

  gl.drawElements(gl.TRIANGLES, m, gl.UNSIGNED_BYTE, 0);

  modelMatrix.scale(1.05, 1.0, 1.05);

  modelMatrix.translate(0.0, 1.0, 0.0);

  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

  gl.drawElements(gl.TRIANGLES, m, gl.UNSIGNED_BYTE, 0);

  modelMatrix.scale(1.08, 3.0, 1.08);

  modelMatrix.translate(0.0, 1.0, 0.0);

  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

  gl.drawElements(gl.TRIANGLES, m, gl.UNSIGNED_BYTE, 0);

  modelMatrix.scale(1.00, -1.0, 1.00);

  modelMatrix.translate(0.0, -2.0, 0.0);

  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

  gl.drawElements(gl.TRIANGLES, m, gl.UNSIGNED_BYTE, 0);

  modelMatrix.scale(0.95, 0.333, 0.95);

  modelMatrix.translate(0.0, -2.0, 0.0);

  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

  gl.drawElements(gl.TRIANGLES, m, gl.UNSIGNED_BYTE, 0);

  modelMatrix.scale(0.95, 1.0, 0.95);

  modelMatrix.translate(0.0, -2.0, 0.0);

  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

  gl.drawElements(gl.TRIANGLES, m, gl.UNSIGNED_BYTE, 0);

  modelMatrix.scale(0.90, 1.0, 0.90);

  modelMatrix.translate(0.0, -2.0, 0.0);

  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

  gl.drawElements(gl.TRIANGLES, m, gl.UNSIGNED_BYTE, 0);
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
  for(i = 0; i < 3; i++) {
    randomGradient[i] += Math.random() > 0.5 ? .01*elapsed/100 : -.01*elapsed/100;
  }
  return angles
}
    
main();