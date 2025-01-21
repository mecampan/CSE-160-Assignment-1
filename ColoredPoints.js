// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform float u_Size;
  void main() {
    gl_Position = a_Position;
    gl_PointSize = u_Size;
  }`

// Fragment shader program
var FSHADER_SOURCE =`
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }`

// Global Variables
let canvas, gl, a_Position, u_Size, u_FragColor;

function setupWebGL() {
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  //gl = getWebGLContext(canvas);
  gl = canvas.getContext("webgl", {preserveDrawingBuffer: true});
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
}

function connectVariablesToGLSL() {
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // // Get the storage location of a_Position
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

    // Get the storage location of u_FragColor
    u_Size = gl.getUniformLocation(gl.program, 'u_Size');
    if (!u_Size) {
      console.log('Failed to get the storage location of u_Size');
      return;
    }

  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }
}

// Constants
const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;

// Globals related to HTML UI elements
let g_selectedColor = [1.0, 1.0, 1.0, 1.0];
let g_selectedSize = 5;
let g_selectedType = POINT;
let g_selectedSegments = 10;

function addActionsforHtmlUI() {
  document.getElementById('redSlider').addEventListener('mouseup',   function() { g_selectedColor[0] = this.value/100; });
  document.getElementById('greenSlider').addEventListener('mouseup', function() { g_selectedColor[1] = this.value/100; });
  document.getElementById('blueSlider').addEventListener('mouseup',  function() { g_selectedColor[2] = this.value/100; });
  document.getElementById('sizeSlider').addEventListener('mouseup',  function() { g_selectedSize = this.value; });
  document.getElementById('segmentSlider').addEventListener('mouseup',  function() { g_selectedSegments = this.value; });

  document.getElementById('pointButton').addEventListener('mousedown', function() { g_selectedType = POINT; });
  document.getElementById('triangleButton').addEventListener('mousedown', function() { g_selectedType = TRIANGLE; });
  document.getElementById('circleButton').addEventListener('mousedown', function() { g_selectedType = CIRCLE; });
  document.getElementById('clearButton').addEventListener('mousedown', function() {clearCanvas(); });
  document.getElementById('demoButton').addEventListener('mousedown', function() {drawDemo('DrawDemo.json'); });
  document.getElementById('undoButton').addEventListener('mousedown', function() {undo(); });
  document.getElementById('redoButton').addEventListener('mousedown', function() {redo(); });

  document.getElementById('gameButton').addEventListener('mousedown', function() { if(!gameActive) {startGame()}; });

  document.addEventListener("keypress", function(ev) {changeDirection(ev);});
}

let drawing = false;
let gameActive = false;

function main() {

  setupWebGL();
  connectVariablesToGLSL();
  addActionsforHtmlUI();

  // Register function (event handler) to be called on a mouse press
  canvas.onmousedown = function(ev) {
    if(!gameActive) {
      drawing = true;
      click(ev);
    }
  };
  canvas.onmousemove = function(ev) {
    if(!gameActive){
      if (drawing && ev.buttons == 1) {
        click(ev);
      }
      previewTool(ev);
    }
  };
  canvas.onmouseup = function() {
    if(!gameActive){
      drawing = false;
      g_shapesList.push(g_currentArray);
      g_currentArray = [];
    }
  };

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
}

var g_currentArray = [];
var g_shapesList = [[]];
var g_undoList = [];

function click(ev) {
  g_undoList = [];
  [x, y] = convertCoordinatesEventToGL(ev);

  let point;
  if (g_selectedType == POINT) {
    point = new Point();
    point.set_position([x, y]);
  } else if (g_selectedType == TRIANGLE) {
    point = new Triangle();
    point.set_position([x, y]);

  } else {
    point = new Circle();
    point.set_segments(g_selectedSegments);
    point.set_position([x, y]);

  }

  point.set_color(g_selectedColor.slice());
  point.set_size(g_selectedSize);
  g_currentArray.push(point);

  renderAllShapes(ev);
}

function convertCoordinatesEventToGL(ev){
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer
  var rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
  y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);

  return ([x, y]);
}

function clearCanvas() {
  // Clear <canvas>
  g_shapesList = [];
  g_undoList = [];
  renderAllShapes();
}

var previewShape;

function previewTool(ev) {
  renderAllShapes();
  [x, y] = convertCoordinatesEventToGL(ev);

  previewShape;
  if ( g_selectedType == POINT ) {
    previewShape = new Point();
  }
  else if ( g_selectedType == TRIANGLE ){
    previewShape = new Triangle();
  }
  else {
    previewShape = new Circle();
    previewShape.segments = g_selectedSegments;
  }

  previewShape.position = [x, y];
  previewShape.color = g_selectedColor.slice();
  previewShape.size = g_selectedSize;

  previewShape.render();
}

function renderAllShapes(ev) {
  var startTime = performance.now();

  gl.clear(gl.COLOR_BUFFER_BIT);

  var len = g_shapesList.length;
  for(var i = 0; i < len; i++) {
    var draw = g_shapesList[i].length;
    for(var j = 0; j < draw; j++) {
      g_shapesList[i][j].render();
    }
  }

  len = g_currentArray.length;
  for(var i = 0; i < len; i++) {
    g_currentArray[i].render();
  }
  
  var duration = performance.now() - startTime;
  //sendToTextHTML(`numdot: ${len} ms: ${Math.floor(duration)} fps: ${Math.floor(10000/duration)}`, "numdot");
}

function sendToTextHTML(text, htmlID) {
  var htmlElm = document.getElementById(htmlID);
  if(!htmlElm) {
    console.log(`Failed to get ${htmlID} from html.`);
    return;
  }

  htmlElm.innerHTML = text;
}

function undo() {
  if (g_shapesList.length > 0) {
    g_undoList.push(g_shapesList.pop());
  }
  renderAllShapes();
}

function redo() {
  if (g_undoList.length > 0) {
    g_shapesList.push(g_undoList.pop());
  }
  renderAllShapes();
}

function drawDemo(file) {
  fetch(file)
    .then(response => response.json())
    .then(data => {
      data.forEach(shapeData => {
        let shape;

        // Determine which class to instantiate based on shape type
        if (shapeData.shape === "point") {
          shape = new Point();
        } else if (shapeData.shape === "circle") {
          shape = new Circle();
          // Set default segment count if not present
          if (typeof shapeData.segment !== 'undefined') {
            shape.set_segment(shapeData.segment);
          }
        } else {
          shape = new Triangle();
        }

        shape.set_color(shapeData.color);
        shape.set_points(shapeData.points);

        g_shapesList.push([shape]);
        shape.render();
      });
    });
}