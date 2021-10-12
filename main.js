glsl = require("glslify");

var VSHADER_SOURCE = glsl.file("./shaders/vertexShader.vert");
var FSHADER_SOURCE = glsl.file("./shaders/fragmentShader.frag");

var ANGLE_STEP = 45.0;
const armSpeeds = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0];

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

  // Set the eye point and the viewing volume
  var mvpMatrix = new Matrix4();
  mvpMatrix.setPerspective(30, 1, 1, 100);
  mvpMatrix.lookAt(3, 3, 7, 0, 0, 0, 0, 1, 0);

  // Pass the model view projection matrix to u_MvpMatrix
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) { 
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }

  var currentAngle = 0.0;
  // Model matrix
  var modelMatrix = new Matrix4();

  // Start drawing
  var tick = function() {
    initVertexBuffers(gl);
    currentAngle = animate(currentAngle);  // Update the rotation angle
    draw(gl, n, currentAngle, modelMatrix, u_ModelMatrix);   // Draw the triangle
    requestAnimationFrame(tick, canvas);   // Request that the browser ?calls tick
  };
  tick();
}

function initVertexBuffers(gl) {
  var verticesColors = new Float32Array(72);
  for(i = 0; i < 36; i+=6){
    verticesColors[i] = 0.4*Math.cos(Math.PI * i/18)//x coord
    verticesColors[i+1] = 1.0 //y coord
    verticesColors[i+2] = 0.4*-Math.sin(Math.PI * i/18) //z coord
    verticesColors[i+3] = 0.625+i/96//R
    verticesColors[i+4] = 0.625+i/96//G
    verticesColors[i+5] = 0.625+i/96//B
    //verticesColors[i+3] = 0.1*(Math.sin(i*Date.now()/10000.0)+1)/2;
    //verticesColors[i+4] = 0.9*(Math.sin(i*Date.now()/10000.0)+1)/2;
    //verticesColors[i+5] = 0.9*(Math.sin(i*Date.now()/10000.0)+1)/2;
  }
  for(i = 36; i < 72; i+=6){
    verticesColors[i] = 0.3*Math.cos(Math.PI * i/18) //x coord
    verticesColors[i+1] = -1.0//y coord
    verticesColors[i+2] = 0.3*-Math.sin(Math.PI * i/18) //z coord
    verticesColors[i+3] = 0.25+i/96//R
    verticesColors[i+4] = 0.25+i/96//G
    verticesColors[i+5] = 0.25+i/96//B
    //verticesColors[i+3] = 0.1*(Math.sin(i*Date.now()/10000.0)+1)/2;
    //verticesColors[i+4] = 0.9*(Math.sin(i*Date.now()/10000.0)+1)/2;
    //verticesColors[i+5] = 0.9*(Math.sin(i*Date.now()/10000.0)+1)/2;
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

function draw(gl, n, currentAngle, modelMatrix, u_ModelMatrix) {
  //==============================================================================
    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT);
    //draw body using layers of stacked prisms
    modelMatrix.setScale(1.5, 0.1, 1.5);

    modelMatrix.translate(0, -3.5, 0);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

    gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);

    modelMatrix.setScale(2, 0.1, 2);

    modelMatrix.translate(0, -2.5, 0);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

    gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);

    modelMatrix.setScale(2.25, 0.1, 2.25);

    modelMatrix.translate(0, -1.5, 0);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

    gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);

    modelMatrix.setScale(2.25, -0.5, 2.25);

    modelMatrix.translate(0, -0.9, 0);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

    gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);

    for(i = 0; i < 8; i++) {
      //start first arm segment
      modelMatrix.setTranslate(0.0,-0.4, 0.0);

      modelMatrix.rotate(45*i, 0, 1, 0);

      modelMatrix.translate(-0.4, 0, 0);

      modelMatrix.scale(0.4, 0.4, 0.4);

      modelMatrix.rotate(currentAngle, 0, 0, 1);

      modelMatrix.translate(0.0, -1.0 ,0.0);		

      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

      gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);

      //start second arm segment
      modelMatrix.translate(0.0, -0.9, 0);

      modelMatrix.scale(0.75, 0.75, 0.75);

      modelMatrix.rotate(-currentAngle*0.3, 0,0,1);

      modelMatrix.translate(0.0, -1.0, 0);

      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

      gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);

      //start third arm segment
      modelMatrix.translate(0.0, -0.9, 0);

      modelMatrix.scale(0.75, 0.75, 0.75);

      modelMatrix.rotate(-currentAngle*0.5, 0, 0, 1);

      modelMatrix.translate(0.0, -1.0, 0);

      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

      gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);

      //start fourth arm segment
      modelMatrix.translate(0.0, -0.9, 0);

      modelMatrix.scale(0.75, 0.75, 0.75);

      modelMatrix.rotate(-currentAngle*0.3, 0, 0, 1);

      modelMatrix.translate(0.0, -1.0, 0);

      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

      gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);

      //fifth and final arm segment
      modelMatrix.translate(0.0, -0.9, 0);

      modelMatrix.scale(0.75, 0.75, 0.75);

      modelMatrix.rotate(currentAngle*0.1, 0, 0, 1);

      modelMatrix.translate(0.0, -1.0, 0);

      gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

      gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
    }
}

var g_last = Date.now();

function animate(angle) {
//==============================================================================
  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - g_last;
  g_last = now;
  
  // Update the current rotation angle (adjusted by the elapsed time)
  if(angle >   5.0 && ANGLE_STEP > 0) ANGLE_STEP = -ANGLE_STEP;
  if(angle <  -105.0 && ANGLE_STEP < 0) ANGLE_STEP = -ANGLE_STEP;
  
  var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
  return newAngle %= 360;
}
    
main();