
 

function addScreenPositionFunction(p5Instance) {
  let p = p5Instance || this;

  // find out which context we're in (2D or WEBGL)
  const R_2D = 0;
  const R_WEBGL = 1;
  let context = getObjectName(p._renderer.drawingContext).search("2D") >= 0 ? R_2D : R_WEBGL;

  // the stack to keep track of matrices when using push and pop
  if (context == R_2D) {
    p._renderer.matrixStack = [new p5.Matrix()];
  }

  // replace all necessary functions to keep track of transformations

  if (p.draw instanceof Function) {
    let drawNative = p.draw;
    p.draw = function(...args) {
      if (context == R_2D) p._renderer.matrixStack = [new p5.Matrix()];
      drawNative.apply(p, args);
    };
  }


  if (p.resetMatrix instanceof Function) {
    let resetMatrixNative = p.resetMatrix;
    p.resetMatrix = function(...args) {
      if (context == R_2D) p._renderer.matrixStack = [new p5.Matrix()];
      resetMatrixNative.apply(p, args);
    };
  }

  if (p.translate instanceof Function) {
    let translateNative = p.translate;
    p.translate = function(...args) {
      if (context == R_2D) last(p._renderer.matrixStack).translate(args);
      translateNative.apply(p, args);
    };
  }

  if (p.rotate instanceof Function) {
    let rotateNative = p.rotate;
    p.rotate = function(...args) {
      if (context == R_2D) {
        let rad = p._toRadians(args[0]);
        last(p._renderer.matrixStack).rotateZ(rad);
      }
      rotateNative.apply(p, args);
    };
  }

  if (p.rotateX instanceof Function) {
    let rotateXNative = p.rotateX;
    p.rotateX = function(...args) {
      if (context == R_2D) {
        let rad = p._toRadians(args[0]);
        last(p._renderer.matrixStack).rotateX(rad);
      }
      rotateXNative.apply(p, args);
    };
  }
  if (p.rotateY instanceof Function) {
    let rotateYNative = p.rotateY;
    p.rotateY = function(...args) {
      if (context == R_2D) {
        let rad = p._toRadians(args[0]);
        last(p._renderer.matrixStack).rotateY(rad);
      }
      rotateYNative.apply(p, args);
    };
  }
  if (p.rotateZ instanceof Function) {
    let rotateZNative = p.rotateZ;
    p.rotateZ = function(...args) {
      if (context == R_2D) {
        let rad = p._toRadians(args[0]);
        last(p._renderer.matrixStack).rotateZ(rad);
      }
      rotateZNative.apply(p, args);
    };
  }

  if (p.scale instanceof Function) {
    let scaleNative = p.scale;
    p.scale = function(...args) {
      if (context == R_2D) {
        let m = last(p._renderer.matrixStack);
        let sx = args[0];
        let sy = args[1] || sx;
        let sz = context == R_2D ? 1 : args[2];
        m.scale([sx, sy, sz]);
      }
      scaleNative.apply(p, args);
    };
  }

  // Help needed: don't know what transformation matrix to use 
  // Solved: Matrix multiplication had to be in reversed order. 
  // Still, this looks like it could be simplified.

  if (p.shearX instanceof Function) {
    let shearXNative = p.shearX;
    p.shearX = function(...args) {
      if (context == R_2D) {
        let rad = p._toRadians(args[0]);
        let stack = p._renderer.matrixStack;
        let m = last(stack);
        let sm = new p5.Matrix();
        sm.mat4[4] = Math.tan(rad);
        sm.mult(m);
        stack[stack.length - 1] = sm;
      }
      shearXNative.apply(p, args);
    };
  }

  if (p.shearY instanceof Function) {
    let shearYNative = p.shearY;
    p.shearY = function(...args) {
      if (context == R_2D) {
        let rad = p._toRadians(args[0]);
        let stack = p._renderer.matrixStack;
        let m = last(stack);
        let sm = new p5.Matrix();
        sm.mat4[1] = Math.tan(rad);
        sm.mult(m);
        stack[stack.length - 1] = sm;
      }
      shearYNative.apply(p, args);
    };
  }


  if (p.applyMatrix instanceof Function) {
    let applyMatrixNative = p.applyMatrix;
    p.applyMatrix = function(...args) {
      if (context == R_2D) {
        let stack = p._renderer.matrixStack;
        let m = last(stack);
        let sm = new p5.Matrix();
        sm.mat4[0] = args[0];
        sm.mat4[1] = args[1];
        sm.mat4[4] = args[2];
        sm.mat4[5] = args[3];
        sm.mat4[12] = args[4];
        sm.mat4[13] = args[5];
        sm.mult(m);
        stack[stack.length - 1] = sm;
      }
      applyMatrixNative.apply(p, args);
    };
  }


  if (p.push instanceof Function) {
    let pushNative = p.push;
    p.push = function(...args) {
      if (context == R_2D) {
        let m = last(p._renderer.matrixStack);
        p._renderer.matrixStack.push(m.copy());
      }
      pushNative.apply(p, args);
    };
  }
  if (p.pop instanceof Function) {
    let popNative = p.pop;
    p.pop = function(...args) {
      if (context == R_2D) p._renderer.matrixStack.pop();
      popNative.apply(p, args);
    };
  }



  p.screenPosition = function(x, y, z) {
    if (x instanceof p5.Vector) {
      let v = x;
      x = v.x;
      y = v.y;
      z = v.z;
    } else if (x instanceof Array) {
      let rg = x;
      x = rg[0];
      y = rg[1];
      z = rg[2] || 0;
    }
    z = z || 0;

    if (context == R_2D) {
      let m = last(p._renderer.matrixStack);
      // probably not needed:
      // let mInv = (new p5.Matrix()).invert(m);

      let v = p.createVector(x, y, z);
      let vCanvas = multMatrixVector(m, v);
      // console.log(vCanvas);
      return vCanvas;

    } else {
      let v = p.createVector(x, y, z);

      // Calculate the ModelViewProjection Matrix.
      let mvp = (p._renderer.uMVMatrix.copy()).mult(p._renderer.uPMatrix);

      // Transform the vector to Normalized Device Coordinate.
      let vNDC = multMatrixVector(mvp, v);

      // Transform vector from NDC to Canvas coordinates.
      let vCanvas = p.createVector();
      vCanvas.x = 0.5 * vNDC.x * p.width;
      vCanvas.y = 0.5 * -vNDC.y * p.height;
      vCanvas.z = 0;

      return vCanvas;
    }

  }


  // helper functions ---------------------------

  function last(arr) {
    return arr[arr.length - 1];
  }

  function getObjectName(obj) {
    var funcNameRegex = /function (.{1,})\(/;
    var results = (funcNameRegex).exec((obj).constructor.toString());
    return (results && results.length > 1) ? results[1] : "";
  };


  /* Multiply a 4x4 homogeneous matrix by a Vector4 considered as point
   * (ie, subject to translation). */
  function multMatrixVector(m, v) {
    if (!(m instanceof p5.Matrix) || !(v instanceof p5.Vector)) {
      print('multMatrixVector : Invalid arguments');
      return;
    }

    var _dest = p.createVector();
    var mat = m.mat4;

    // Multiply in column major order.
    _dest.x = mat[0] * v.x + mat[4] * v.y + mat[8] * v.z + mat[12];
    _dest.y = mat[1] * v.x + mat[5] * v.y + mat[9] * v.z + mat[13];
    _dest.z = mat[2] * v.x + mat[6] * v.y + mat[10] * v.z + mat[14];
    var w = mat[3] * v.x + mat[7] * v.y + mat[11] * v.z + mat[15];

    if (Math.abs(w) > Number.EPSILON) {
      _dest.mult(1.0 / w);
    }

    return _dest;
  }

}




/////////////////////////////////////////////////////////////////////////////////

var easycam1, easycam2;
let graphics1;

  var rectSz = 250;


var rsz = 50;

let modelo;
let modelo001;
let modelo002;
let modelo003;
let modelo004;
let modeloPieza;
let modeloPieza0;


let pg0;
let state = 0;
let gPoint0;
let gPoint1;
let gPoint2;
let gPoint3;
let gPoint4;
let gPoint8;


var texturaa;

var val = -10;
//templates

var values0 = 0;

let menuap;
let homeap;
var penap = false;
let penApColor;
let penApColor0;
let strCol;
let notasap;
let camarap;
let modeloap;

let state00 = true;
let capture;

let foto0;


var states;
var states0;


var penColor = ['red','green','blue','black'];
var pen = false;
var penSize = 1;

var botonSz = 10;

function preload() {

  //templates

  penApColor = "#fefefe";
  penApColor0 = "#FF3464";

  menuap = loadImage("Entregable - copia/menu.png");
  homeap = loadImage("Entregable - copia/home.png");
  notasap = loadImage("Entregable - copia/notas.png");
  camarap = loadImage("Entregable - copia/guardar.png");
 modeloap = loadImage("Entregable - copia/modelos.png");


  //
  modelo = loadModel("cncniu.obj");
  modelo001 = loadModel("cncniu1.obj");
  modelo002 = loadModel("cncniu2.obj");
  modelo003 = loadModel("cncniu3.obj");
  modelo004 = loadModel("cnc005.obj");
  modeloPieza = loadModel("cortadorr.obj");
  modeloPieza0 = loadModel("cnctest1.obj");
  camaejey = loadModel("camaejey.obj");
  cosoejey = loadModel("cosoejey.obj");
  cosoejex1 = loadModel("cosoejex1.obj");
  cosoejex2 = loadModel("cosoejexdos.obj");
  cosoejez1 = loadModel("cosoejez1.obj");
  cosoejez2 = loadModel("cosoejez2.obj");

  foto0 = loadImage("uno2.jpg");
  texturaa = loadImage("vanue0.jpg")
}




function setup() {

  pixelDensity(2);

  capture = createCapture(VIDEO);
  capture.size(320, 240)
  capture.hide();

  strCol = color(0);

  var canvas = createCanvas(windowWidth, windowHeight);

  var w = Math.ceil(windowWidth);
  var h = windowHeight;
  
  graphics1 = createGraphics(w, h, WEBGL)
  pg0 = createGraphics(windowWidth,windowHeight);

  addScreenPositionFunction(graphics1);





  easycam1 = new Dw.EasyCam(graphics1._renderer, {distance : 350});
  easycam1.setDistanceMin(10);
  easycam1.setDistanceMax(3000);

  easycam1.attachMouseListeners(this._renderer);


  easycam1.IDX = 0;

  easycam1.setViewport([0,0,w,h]);



} 



function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  
  var w = Math.ceil(windowWidth);
  var h = windowHeight;

  easycam1.renderer.resize(w,h);

  easycam1.graphics.width  = w;
  easycam1.graphics.height = h;

  easycam1.setViewport([0,0,w,h]);

}



function draw(){
  background(250);

  displayScene(easycam1);
  displayResult_P2D();

    if(keyIsPressed){
      if(key === 's'){
      save("1.png");
    }
  }
}




function displayResult_P2D(){
  var vp1 = easycam1.getViewport();
  
  image(easycam1.graphics, vp1[0], vp1[1], vp1[2], vp1[3]);



 if(state === 0){




  noStroke();
  push();
  translate(width/2, height/2);
  const gPoint = graphics1.screenPosition(-110, -60, 100);

  if(dist(gPoint.x, gPoint.y,mouseX-width/2,mouseY-height/2)<=botonSz){
    if(mouseIsPressed){
             window.open("https://www.youtube.com/watch?v=YT5YifAJZEQ");

    }
  }



  fill("#FF3464");
  ellipse(gPoint.x, gPoint.y, botonSz,botonSz);

  var d = dist(gPoint.x, gPoint.y,mouseX-width/2,mouseY-height/2);

  if(d <= botonSz){
    fill(255,0,0,200);
    var sz01 = 250;
    var sz02 = sz01/2;

    strokeWeight(1);
    stroke(0,50);

    fill("#E8E8E8");
    rect(width/2-250,-height/2+20,230,300,5);

    textSize(11);
    fill(0);
    textAlign(LEFT);
    text("El software Aspire CAD CAM está construido sobre la misma plataforma que el software VCarve Pro, compartiendo la interfaz intuitiva y facilidad de uso para el diseño de producción y el enrutamiento. Además, el software Aspire también tiene herramientas que te permiten transformar bocetos en 2D, fotos, dibujo y arte digital en modelos detallados 3D y para después calcular las trayectorias de herramientas para cortar con precisión estas formas."
+ "El software Aspire es utilizado por una gran variedad de empresas y particulares para crear paneles decorativos y puertas, adornos ornamentales, carpintería a medida, molduras arquitectónicas, señalización dimensional, logotipos tallados de empresas, regalos y premios personalizados, además de muchas más aplicaciones.",width/2-250+10,-height/2+20+10,230-10,300+10);

    fill("#FF3464");
  }else{
    fill(200,200);
  }
  
  strokeWeight(1);
  stroke(0,50);
  rect(gPoint.x, gPoint.y,rsz*1.5,rsz/2,15);
  textSize(15);
  fill(0);
  textAlign(LEFT);
  text("Control",gPoint.x+10, gPoint.y+5, rsz, rsz);
  pop();


  push();
  translate(width/2, height/2);
  gPoint0 = graphics1.screenPosition(-40, -10, 60);
  fill("#FF3464");
  ellipse(gPoint0.x, gPoint0.y, botonSz,botonSz);

  var d0 = dist(gPoint0.x, gPoint0.y,mouseX-width/2,mouseY-height/2);

  if(d0 <= botonSz){
    fill(255,0,0,200);
    var sz01 = 250;
    var sz02 = sz01/2;

    strokeWeight(1);
    stroke(0,50);
    fill("#E8E8E8");
    rect(width/2-250,-height/2+20,230,300,5);

    textSize(11);
    fill(0);
    textAlign(LEFT);
    text("Spindle: Un Spindle es el sustituto del Router (Rebajadora) pero en versión mejorada, este sistema normalmente es bifásico o trifásico, normalmente es enfriado por aire o por agua, esta ventaja le permite trabajar mayor tiempo continuamente. Otra característica del Spindle es el rango de velocidad en RPM y puede oscilar desde los 10,000 a los 60,000 RPM. No podemos dejar pasar otra punto importante que es la potencia del Spindle y hay Spindles a partir de los 100 Watts, realmente pequeños, hasta los industriales que van por encima de los 5HP, el rango de frecuencia de operación inicia desde los 0.1 a los 400 Hz para la señal PWM, al cambiar la frecuencia, cambiará la velocidad.",width/2-250+10,-height/2+20+10,230-10,300+10);

    fill("#FF3464");
  }else{
    fill(200,200);
  }

  strokeWeight(1);
  stroke(0,50);
  rect(gPoint0.x, gPoint0.y,rsz*1.5,rsz/2,15);
  textSize(15);
  fill(0);
  textAlign(LEFT);
  text("Spindle",gPoint0.x+10, gPoint0.y+5, rsz, rsz);
  pop();


  push();
  translate(width/2, height/2);
  gPoint1 = graphics1.screenPosition(100,-5, 0);
  fill("#FF3464");
  ellipse(gPoint1.x, gPoint1.y, botonSz,botonSz);


  if(dist(gPoint1.x, gPoint1.y,mouseX-width/2,mouseY-height/2)<=botonSz){
    if(mouseIsPressed){

      image(foto0,width/2-400-25,-height/2+25,400,300);
    }
  }

  var d1 = dist(gPoint1.x, gPoint1.y,mouseX-width/2,mouseY-height/2);

  if(d1 <= botonSz){
    fill(255,0,0,200);
    var sz01 = 250;
    var sz02 = sz01/2;

    strokeWeight(1);
    stroke(0,50);
    fill("#E8E8E8");
    rect(width/2-250,-height/2+20,230,300,5);

    textSize(11);
    fill(0);
    textAlign(LEFT);
    text("Cama: Base de 1.22x2.44mts para corte de diferentes materiales, tales como: Madera sólida (caoba, pino, secoya, fresco, etc)"
+ "Madera blanda (pino, cedro, abeto, secoya)"
+ "Madera compuesta (mdf, aglomerado, melanina, madera contrachapado, etc)"
+ "Metal (aluminio, acero, bronce, cobre)"
+ "Plástico (policarbonato, acrílico, polietileno, acetato, etc)"
+ "Foam (EVA, goma espuma, caucho de silicón, polietileno)"
+ "Otros como cuero, fibra de vidrios, fibra de carbón, yeso, etc",width/2-250+10,-height/2+20+10,230-10,300+10);

    fill("#FF3464");
  }else{
    fill(200,200);
  }

  strokeWeight(1);
  stroke(0,50);
  rect(gPoint1.x, gPoint1.y,rsz*1.5,rsz/2,15);
  textSize(15);
  fill(0);
  textAlign(LEFT);
  text("Cama",gPoint1.x+10, gPoint1.y+5, rsz, rsz);
  pop();




  push();
  translate(width/2, height/2);
  gPoint4 = graphics1.screenPosition(-25, 10, 90);
  fill("#FF3464");
  ellipse(gPoint4.x, gPoint4.y, botonSz,botonSz);



  var d2 = dist(gPoint4.x, gPoint4.y,mouseX-width/2,mouseY-height/2);

  if(d2 <= botonSz){
    fill(255,0,0,200);
    var sz01 = 250;
    var sz02 = sz01/2;

    strokeWeight(1);
    stroke(0,50);
    fill("#E8E8E8");
    rect(width/2-250,-height/2+20,230,300,5);


    textSize(11);
    fill(0);
    textAlign(LEFT);
    text("Ejes de movimiento: Eje X es horizontal y paralelo a la superficie de sujeción de la pieza, el eje Y forma con los ejes z y x un triedro de sentido directo y el eje Z poseé la potencia del corte y ahí va montada la herramienta cortante y puede adoptar distintas posiciones según las posibilidades del cabzal. Las cotas se miden con respecto del origen de coordenadas, admiten 4 cifras en la parte entera además del signo y 3 decimales",width/2-250+10,-height/2+20+10,230-10,300+10);

    fill("#FF3464");
  }else{
    fill(200,200);
  }

  strokeWeight(1);
  stroke(0,50);
  rect(gPoint4.x, gPoint4.y,rsz*1.5,rsz/2,15);
  textSize(15);
  fill(0);
  textAlign(LEFT);
  text("Eje Y",gPoint4.x+10, gPoint4.y+5, rsz, rsz);
  pop();

  push();
  translate(width/2, height/2);
  gPoint3 = graphics1.screenPosition(-25, -40, -25);
  fill("#FF3464");
  ellipse(gPoint3.x, gPoint3.y, botonSz,botonSz);

    var d3 = dist(gPoint3.x, gPoint3.y,mouseX-width/2,mouseY-height/2);

  if(d3 <= botonSz){
    fill(255,0,0,200);
    var sz01 = 250;
    var sz02 = sz01/2;

    strokeWeight(1);
    stroke(0,50);
    fill("#E8E8E8");
    rect(width/2-250,-height/2+20,230,300,5);

    textSize(11);
    fill(0);
    textAlign(LEFT);
    text("Ejes de movimiento: Eje X es horizontal y paralelo a la superficie de sujeción de la pieza, el eje Y forma con los ejes z y x un triedro de sentido directo y el eje Z poseé la potencia del corte y ahí va montada la herramienta cortante y puede adoptar distintas posiciones según las posibilidades del cabzal. Las cotas se miden con respecto del origen de coordenadas, admiten 4 cifras en la parte entera además del signo y 3 decimales",width/2-250+10,-height/2+20+10,230-10,300+10);

   fill("#FF3464");
  }else{
    fill(200,200);
  }
  strokeWeight(1);
  stroke(0,50);
  rect(gPoint3.x, gPoint3.y,rsz*1.5,rsz/2,15);
  textSize(15);
  fill(0);
  textAlign(LEFT);
  text("Eje X",gPoint3.x+10, gPoint3.y+5, rsz, rsz);
  pop();




  push();
  translate(width/2, height/2);
  gPoint8 = graphics1.screenPosition(150, -5, 0);
  fill("#FF3464");
  ellipse(gPoint8.x, gPoint8.y, botonSz,botonSz);

    var d4 = dist(gPoint8.x, gPoint8.y,mouseX-width/2,mouseY-height/2);

  if(d4 <= botonSz){
    fill(255,0,0,200);
    var sz01 = 250;
    var sz02 = sz01/2;

    strokeWeight(1);
    stroke(0,11);
    fill("#E8E8E8");
    rect(width/2-250,-height/2+20,230,300,5);
    textSize(11);
    fill(0);
    textAlign(LEFT);
    text("Ejes de movimiento: Eje X es horizontal y paralelo a la superficie de sujeción de la pieza, el eje Y forma con los ejes z y x un triedro de sentido directo y el eje Z poseé la potencia del corte y ahí va montada la herramienta cortante y puede adoptar distintas posiciones según las posibilidades del cabzal. Las cotas se miden con respecto del origen de coordenadas, admiten 4 cifras en la parte entera además del signo y 3 decimales",width/2-250+10,-height/2+20+10,230-10,300+10);

    fill("#FF3464");
  }else{
    fill(200,200);
  }
  strokeWeight(1);
  stroke(0,50);
  rect(gPoint8.x, gPoint8.y,rsz*1.5,rsz,15);
  textSize(15);
  fill(0);
  textAlign(LEFT);
  text("Ejes (x,y,z)",gPoint8.x+10, gPoint8.y+5, rsz, rsz);
  pop();


}

if(state === 1){


  push();
  translate(width/2, height/2);
  gPoint2 = graphics1.screenPosition(-5, 330, 40);
  fill("#FF3464");
  ellipse(gPoint2.x, gPoint2.y, botonSz,botonSz);

  var d4 = dist(gPoint2.x, gPoint2.y,mouseX-width/2,mouseY-height/2);

  if(d4 <= botonSz){
    fill(255,0,0,200);
    var sz01 = 250;
    var sz02 = sz01/2;

    strokeWeight(1);
    stroke(0,50);
    fill("#E8E8E8");
    rect(width/2-250,-height/2+20,230,300,5);

    textSize(11);
    fill(0);
    textAlign(LEFT);
    text("Cortador: ",width/2-250+10,-height/2+20+10,230-10,300+10);

    fill("#FF3464");
  }else{
    fill(200,200);
  }
  strokeWeight(1);
  stroke(0,50);
  rect(gPoint2.x, gPoint2.y,rsz*1.5,rsz/2,15);
  textSize(15);
  fill(0);
  textAlign(LEFT);
  text("Cortador",gPoint2.x+10, gPoint2.y+5, rsz, rsz);
  pop();



  push();
  translate(width/2, height/2);
  gPoint5 = graphics1.screenPosition(-25, -75, -30);
  fill("#FF3464");
  ellipse(gPoint5.x, gPoint5.y, botonSz,botonSz);

  var d5 = dist(gPoint5.x, gPoint5.y,mouseX-width/2,mouseY-height/2);

  if(d5 <= botonSz){
    fill("#FF3464");
    var sz01 = 250;
    var sz02 = sz01/2;

    strokeWeight(1);
    stroke(0,50);
    fill("#E8E8E8");
    rect(width/2-250,-height/2+20,230,300,5);

    textSize(11);
    fill(0);
    textAlign(LEFT);
    text("Ejes de movimiento: Eje X es horizontal y paralelo a la superficie de sujeción de la pieza, el eje Y forma con los ejes z y x un triedro de sentido directo y el eje Z poseé la potencia del corte y ahí va montada la herramienta cortante y puede adoptar distintas posiciones según las posibilidades del cabzal. Las cotas se miden con respecto del origen de coordenadas, admiten 4 cifras en la parte entera además del signo y 3 decimales",-width/2+25,0,200,height);

    fill("#FF3464");
  }else{
    fill(200,200);
  }

  strokeWeight(1);
  stroke(0,50);
  rect(gPoint5.x, gPoint5.y,rsz*1.5,rsz/2,15);
  textSize(15);
  fill(0);
  textAlign(LEFT);
  text("Eje Z",gPoint5.x+10, gPoint5.y+5, rsz, rsz);
  pop();

}


if(state === 2){

    var sz01 = 250;
    var sz02 = sz01/2;
    push();
    translate(width/2, height/2);
    strokeWeight(1);
    stroke(0,50);
    fill("#E8E8E8");
    rect(width/2-250,-height/2+20,230,300,5);

    textSize(11);
    fill(0);
    textAlign(LEFT);
    text("Cortador: ",width/2-250+10,-height/2+20+10,230-10,300+10);
    pop();
}


if(state === 3){



    var sz01 = 250;
    var sz02 = sz01/2;
    push();
    translate(width/2, height/2);
    strokeWeight(1);
    stroke(0,50);
    fill("#E8E8E8");
    rect(width/2-250,-height/2+20,230,300,5);

    textSize(11);
    fill(0);
    textAlign(LEFT);
    text("Ejes de movimiento: Eje X es horizontal y paralelo a la superficie de sujeción de la pieza, el eje Y forma con los ejes z y x un triedro de sentido directo y el eje Z poseé la potencia del corte y ahí va montada la herramienta cortante y puede adoptar distintas posiciones según las posibilidades del cabzal. Las cotas se miden con respecto del origen de coordenadas, admiten 4 cifras en la parte entera además del signo y 3 decimales",width/2-250+10,-height/2+20+10,230-10,300+10);
    pop();
}

  
if(state === 4){


    var sz01 = 250;
    var sz02 = sz01/2;
    push();
    translate(width/2, height/2);
    strokeWeight(1);
    stroke(0,50);
    fill("#E8E8E8");
    rect(width/2-250,-height/2+20,230,300,5);

    textSize(11);
    fill(0);
    textAlign(LEFT);
    text("Ejes de movimiento: Eje X es horizontal y paralelo a la superficie de sujeción de la pieza, el eje Y forma con los ejes z y x un triedro de sentido directo y el eje Z poseé la potencia del corte y ahí va montada la herramienta cortante y puede adoptar distintas posiciones según las posibilidades del cabzal. Las cotas se miden con respecto del origen de coordenadas, admiten 4 cifras en la parte entera además del signo y 3 decimales",width/2-250+10,-height/2+20+10,230-10,300+10);
    pop();
}

if(state === 5){


    var sz01 = 250;
    var sz02 = sz01/2;
    push();
    translate(width/2, height/2);
    strokeWeight(1);
    stroke(0,50);
    fill("#E8E8E8");
    rect(width/2-250,-height/2+20,230,300,5);

    textSize(11);
    fill(0);
    textAlign(LEFT);
    text("Ejes de movimiento: Eje X es horizontal y paralelo a la superficie de sujeción de la pieza, el eje Y forma con los ejes z y x un triedro de sentido directo y el eje Z poseé la potencia del corte y ahí va montada la herramienta cortante y puede adoptar distintas posiciones según las posibilidades del cabzal. Las cotas se miden con respecto del origen de coordenadas, admiten 4 cifras en la parte entera además del signo y 3 decimales",width/2-250+10,-height/2+20+10,230-10,300+10);
    pop();
}

if(state === 6){



    var sz01 = 250;
    var sz02 = sz01/2;
    push();
    translate(width/2, height/2);
    strokeWeight(1);
    stroke(0,50);
    fill("#E8E8E8");
    rect(width/2-250,-height/2+20,230,300,5);

    textSize(11);
    fill(0);
    textAlign(LEFT);
    text("Ejes de movimiento: Eje X es horizontal y paralelo a la superficie de sujeción de la pieza, el eje Y forma con los ejes z y x un triedro de sentido directo y el eje Z poseé la potencia del corte y ahí va montada la herramienta cortante y puede adoptar distintas posiciones según las posibilidades del cabzal. Las cotas se miden con respecto del origen de coordenadas, admiten 4 cifras en la parte entera además del signo y 3 decimales",width/2-250+10,-height/2+20+10,230-10,300+10);
    pop();
}

//templates
  fill(255,0,0);
  //ellipse(20,20,15,15);


   if(state00 === false){
      push();
      imageMode(CENTER);
      image(menuap,20,20);
      pop();

    }



   if(state00 === true){
      push();
      imageMode(CENTER);
      image(menuap,rectSz+20,20);
      fill(255,0,0);
      fill("#3A404A");
      rect(0,0,rectSz,height);

      fill("#FF3464");
      rect(20,20,rectSz-40,45,5);
      fill(255);
      //ellipse(125,42,botonSz,botonSz);
      homeap.resize(15,15);
      image(homeap,40,41);
      textSize(15);
      text("Modelo Principal",75,47);


      fill("#5D6675");
      rect(20,300,rectSz-40,95,5);

/////////////////////////////////////////////////////////////
  




      

/////////////////////////////////////////////////////////////

      fill("#5D6675");
      rect(20,45+35,rectSz-40,200,5);

      textSize(13);
      rectMode(CENTER);
      fill(penApColor);
      rect(47,45+55,15,15,2.5);
      fill(255);
      textAlign(CENTER,CENTER);
      text("Pluma",77,45+57);
      fill(penApColor0);
      rect(110,45+55,15,15,2.5);
      fill(255);
      text("Borrar",140,45+57);

      rectMode(CORNER);
      fill(255);
      rect(40-15/2,120,rectSz-65,100,2.5);

      rectMode(CENTER);
      fill(0);
      rect(46,135,15,15,2.5);
      fill(0,0,255);
      rect(66,135,15,15,2.5);
      fill(255,0,0);
      rect(86,135,15,15,2.5);
      fill(0,255,0);
      rect(106,135,15,15,2.5);
      fill(255,255,0);
      rect(126,135,15,15,2.5);
      fill(255,0,255);
      rect(146,135,15,15,2.5);
      fill(0,255,255);
      rect(166,135,15,15,2.5);
      fill(150);
      rect(186,135,15,15,2.5);
      fill(150,0,150);
      rect(206,135,15,15,2.5);

      textSize(12);
      
      if(penSize === 1){
      fill("#FF3464");
      ellipse(47+val,250,5,5);
      textAlign(CENTER,CENTER);
      fill(255);
      text("5px",65+val,250);
      fill(255);
      ellipse(87+val,250,10,10);
      fill(255);
      text("10px",107+val,250);
      fill(255);
      ellipse(137+val,250,15,15);
      fill(255);
      text("15px",160+val,250);
      fill(255);
      ellipse(197+val,250,18,18);
      fill(255);
      text("18px",220+val,250);
    }


      if(penSize === 5){
      fill(255);
      ellipse(47+val,250,5,5);
      textAlign(CENTER,CENTER);
      fill(255);
      text("5px",65+val,250);
      fill("#FF3464");
      ellipse(87+val,250,10,10);
      fill(255);
      text("10px",107+val,250);
      fill(255);
      ellipse(137+val,250,15,15);
      fill(255);
      text("15px",160+val,250);
      fill(255);
      ellipse(197+val,250,18,18);
      fill(255);
      text("18px",220+val,250);
    }


      if(penSize === 10){
      fill(255);
      ellipse(47+val,250,5,5);
      textAlign(CENTER,CENTER);
      fill(255);
      text("5px",65+val,250);
      fill(255);
      ellipse(87+val,250,10,10);
      fill(255);
      text("10px",107+val,250);
      fill("#FF3464");
      ellipse(137+val,250,15,15);
      fill(255);
      text("15px",160+val,250);
      fill(255);
      ellipse(197+val,250,18,18);
      fill(255);
      text("18px",220+val,250);
    }


      if(penSize === 15){
      fill(255);
      ellipse(47+val,250,5,5);
      textAlign(CENTER,CENTER);
      fill(255);
      text("5px",65+val,250);
      fill(255);
      ellipse(87+val,250,10,10);
      fill(255);
      text("10px",107+val,250);
      fill(255);
      ellipse(137+val,250,15,15);
      fill(255);
      text("15px",160+val,250);
      fill("#FF3464");
      ellipse(197+val,250,18,18);
      fill(255);
      text("18px",220+val,250);
    }



      pop();
    }


//////////////////////////////////////////////////////////////
    push();


    fill(255);
    rect(37,310,15,15,2.5);
    rect(110,310,15,15,2.5);
    textSize(13);
    textSize(13);
    textAlign(CENTER);
    text("Vista 1",77,320);
    text("Guardar vista 1",175,320);

    var dd0 = dist(mouseX,mouseY,37,310);
    var dd1 = dist(mouseX,mouseY,110,310);


    if(mouseIsPressed){
      if(dd0 <= 13){
      easycam1.setState(states0, 2000)
      
      fill("#FF3464");
      rect(37,310,15,15,2.5);
      }else{
      fill(255);
      rect(37,310,15,15,2.5);
      }
      if(dd1 <= 13){
      states0 = easycam1.getState()
      fill("#FF3464");
      rect(110,310,15,15,2.5);
      }else{
      fill(255);
      rect(110,310,15,15,2.5);
      }
    }
//////////////////////////////////////////////////////////////

    fill(255);
    rect(37,330,15,15,2.5);
    rect(110,330,15,15,2.5);
    textSize(13);
    textSize(13);
    textAlign(CENTER);
    text("Vista 2",77,340);
    text("Guardar vista 2",175,340);



    var dd2 = dist(mouseX,mouseY,37,330);
    var dd3 = dist(mouseX,mouseY,110,330);


    if(mouseIsPressed){
      if(dd2 <= 13){
      easycam1.setState(states, 2000)
      
      fill("#FF3464");
      rect(37,330,15,15,2.5);
      }else{
      fill(255);
      rect(37,330,15,15,2.5);
      }
      if(dd3 <= 13){
      states = easycam1.getState()
      fill("#FF3464");
      rect(110,330,15,15,2.5);
      }else{
      fill(255);
      rect(110,330,15,15,2.5);
      }
    }
//////////////////////////////////////////////////////////////

    fill(255);
    rect(37,350,15,15,2.5);
    rect(110,350,15,15,2.5);
    textSize(13);
    textSize(13);
    textAlign(CENTER);
    text("Vista 3",77,360);
    text("Guardar vista 3",175,360);
//////////////////////////////////////////////////////////////

    fill(255);
    rect(37,370,15,15,2.5);
    rect(110,370,15,15,2.5);
    textSize(13);
    textSize(13);
    textAlign(CENTER);
    text("Vista 4",77,380);
    text("Guardar vista 4",175,380);
//////////////////////////////////////////////////////////////


    pop();



      push();
      imageMode(CENTER);
      strokeWeight(40);
      stroke("#5D6675");
      line(width/2+50-50,height-40,width/2+50+50,height-40);
      strokeWeight(5);
      stroke(0);
      notasap.resize(30,30);
      camarap.resize(30,30);
      modeloap.resize(30,30);
      image(notasap,width/2+50-40,height-40);
      image(camarap,width/2+50,height-40);
      image(modeloap,width/2+50+40,height-40);
      noStroke();
      pop();

      push();
      scale(0.8);
      image(capture,width+50,height-75);
      pop();



  if(penap === true){
    if(keyIsPressed){
      if(key === 'd'){
        pg0.background(255,0);
        
        if(values0 === 0){
        pg0.stroke(0);
      }
        if(values0 === 1){
        pg0.stroke(0,0,255);
      }
        if(values0 === 2){
        pg0.stroke(255,0,0);
      }
        if(values0 === 3){
        pg0.stroke(0,255,0);
      }
        if(values0 === 4){
        pg0.stroke(255,255,0);
      }
        if(values0 === 5){
        pg0.stroke(255,0,255);
      }
        if(values0 === 6){
        pg0.stroke(0,255,255);
      }
        if(values0 === 7){
        pg0.stroke(150);
      }
        if(values0 === 8){
        pg0.stroke(150,0,150);
      }
        pg0.strokeWeight(penSize);
        pg0.line(mouseX,mouseY,pmouseX,pmouseY);
    }
  }
    image(pg0,0,0);
}else{
    pg0.clear();
}







  

}


function mousePressed() {

    if (dist(mouseX, mouseY, rectSz+20,20) < 50) {
    state00 = false;
  }



    if (dist(mouseX, mouseY, 20,20) < 50) {
    state00 = true;
  }


  if (dist(mouseX, mouseY, width/2+gPoint0.x,height/2+gPoint0.y) < botonSz) {
    state = 1;
  }

    if (dist(mouseX, mouseY,  width/2+gPoint2.x,height/2+gPoint2.y) < botonSz) {
    state = 2;
  }

     if (dist(mouseX, mouseY,  width/2+gPoint4.x,height/2+gPoint4.y) < botonSz) {
    state = 3;
  }
     if (dist(mouseX, mouseY,  width/2+gPoint3.x,height/2+gPoint3.y) < botonSz) {
    state = 4;
  }
     if (dist(mouseX, mouseY,  width/2+gPoint5.x,height/2+gPoint5.y) < botonSz) {
    state = 5;
  }
       if (dist(mouseX, mouseY,  width/2+gPoint8.x,height/2+gPoint8.y) < botonSz) {
    state = 6;
  }





  if(state00 == true){
    if (dist(mouseX, mouseY, 125,47) < 50) {
    state = 0;
  }




    if (dist(mouseX, mouseY, 47,100) < 25) {
    penap = true;
    penApColor = "#FF3464";
    penApColor0 = "#fefefe";
  }
  if (dist(mouseX, mouseY, 120,100) < 25) {
    penap = false;
    penApColor = "#fefefe";
    penApColor0 = "#FF3464";
  }


       if (dist(mouseX, mouseY, 66,135) < 15) {
    values0 = 1;
  }

     if (dist(mouseX, mouseY, 46,135) < 15) {
    values0 = 0;
  }
       if (dist(mouseX, mouseY, 86,135) < 15) {
    values0 = 2;
  }
       if (dist(mouseX, mouseY, 106,135) < 15) {
    values0 = 3;
  }
       if (dist(mouseX, mouseY, 126,135) < 15) {
    values0 = 4;
  }

       if (dist(mouseX, mouseY, 146,135) < 15) {
    values0 = 5;
  }    
     if (dist(mouseX, mouseY, 166,135) < 15) {
    values0 = 6;
  }
       if (dist(mouseX, mouseY, 186,135) < 15) {
    values0 = 7;
  }
       if (dist(mouseX, mouseY, 206,135) < 15) {
    values0 = 8;
  }




  if (dist(mouseX, mouseY, 47+val,250) < 5) {
    penSize = 1;
  }

    if (dist(mouseX, mouseY, 87+val,250) < 5) {
    penSize = 5;
  }

      if (dist(mouseX, mouseY, 137+val,250) < 10) {
    penSize = 10;
  }

       if (dist(mouseX, mouseY, 197+val,250) < 15) {
    penSize = 15;
  }



  }


}


function keyReleased(){
  if(key == '2') states0 = easycam1.getState();
  if(key == '4') easycam1.setState(states0, 2000);
}







function displayResult_WEBGL(){
  var vp1 = easycam1.getViewport();
 
  resetMatrix();
  ortho(0, width, -height, 0, -Number.MAX_VALUE, +Number.MAX_VALUE);

  texture(easycam1.graphics);
  rect(vp1[0], vp1[1], vp1[2], vp1[3]);
}




function displayScene(cam){



  var pg = cam.graphics;
  
  var w = pg.width;
  var h = pg.height;
  
  var gray = 200;


  pg.push();
  pg.translate(65,-15,0);
  //pg.translate(0,0,0);

  if(state === 0){
  pg.push();
  pg.translate(0,100,0);
  pg.rotateX(PI);
  pg.rotateY(PI+PI/2);
  pg.noStroke();
  pg.perspective(60 * PI/180, w/h, 1, 5000);


  if(cam.IDX == 0) pg.clear();


  pg.lights();
 pg.directionalLight(150,150,150, 1, 0, 0);
  pg.directionalLight(150,150,150, -1, 0, 0);

  pg.strokeWeight(0.3);
  pg.stroke(0,200);

  pg.fill(250,0,0);
  pg.scale(100);
  //pg.texture(texturaa);
  pg.model(modelo);
  pg.fill(60);
  pg.model(modelo001);
  pg.fill(60);
  pg.model(modelo002);
  pg.fill(200);
  pg.model(modelo003);
  pg.pop();
}

  if(state === 1){
  pg.push();
  pg.translate(0,0,0);
  pg.rotateX(PI);
  pg.rotateY(PI+PI/2);
  pg.noStroke();
  pg.perspective(60 * PI/180, w/h, 1, 5000);
  if(cam.IDX == 0) pg.clear();


  pg.ambientLight(255);
  pg.pointLight(255,255,255,0,-100,100);
  pg.pointLight(255,255,255,0,-100,-100);
  pg.pointLight(255,255,255,0,0,200);
  pg.pointLight(255,255,255,0,0,-200);

  pg.strokeWeight(1);
  pg.stroke(0,200);
  pg.fill(100);
  pg.scale(900);
  pg.model(modeloPieza);
  pg.pop();
}  
if(state === 2){
  pg.push();
  pg.translate(0,0,0);
  pg.rotateX(PI);
  pg.rotateY(PI+PI/2);
  pg.noStroke();
  pg.perspective(60 * PI/180, w/h, 1, 5000);
  if(cam.IDX == 0) pg.clear();


  pg.ambientLight(255);
  pg.pointLight(255,255,255,0,-100,100);
  pg.pointLight(255,255,255,0,-100,-100);
  pg.pointLight(255,255,255,0,0,200);
  pg.pointLight(255,255,255,0,0,-200);

  pg.strokeWeight(1);
  pg.stroke(0,200);
  pg.fill(100);
  pg.scale(5);
  pg.model(modeloPieza0);
  pg.pop();
}



if(state === 3){
  pg.push();
  pg.translate(0,100,0);
  pg.rotateX(PI);
  pg.rotateY(PI+PI/2);
  pg.noStroke();
  pg.perspective(60 * PI/180, w/h, 1, 5000);
  if(cam.IDX == 0) pg.clear();


  pg.ambientLight(255);
  pg.pointLight(255,255,255,0,-100,100);
  pg.pointLight(255,255,255,0,-100,-100);
  pg.pointLight(255,255,255,0,0,200);
  pg.pointLight(255,255,255,0,0,-200);

  pg.strokeWeight(1);
  pg.stroke(0,200);
  pg.fill(100);
  pg.scale(100);
  pg.model(camaejey);

  var value00 = map(sin(frameCount*0.01),-1,1,-0.2,2);

  pg.translate(0,0,-value00);
  pg.model(cosoejey);

  pg.pop();

}

if(state === 4){
  pg.push();
  pg.translate(0,100,0);
  pg.rotateX(PI);
  pg.rotateY(PI+PI/2);
  pg.noStroke();
  pg.perspective(60 * PI/180, w/h, 1, 5000);
  if(cam.IDX == 0) pg.clear();


  pg.ambientLight(255);
  pg.pointLight(255,255,255,0,-100,100);
  pg.pointLight(255,255,255,0,-100,-100);
  pg.pointLight(255,255,255,0,0,200);
  pg.pointLight(255,255,255,0,0,-200);

  pg.strokeWeight(1);
  pg.stroke(0,200);
  pg.fill(100);
  pg.scale(100);
  pg.model(camaejey);
  pg.model(cosoejex1);

  var value00 = map(sin(frameCount*0.01),-1,1,-0.1,1);

  pg.translate(value00,0,0);
  pg.model(cosoejex2);

  pg.pop();

}
if(state === 5){
  pg.push();
  pg.translate(0,0,0);
  pg.rotateX(PI);
  pg.rotateY(PI+PI/2);
  pg.noStroke();
  pg.perspective(60 * PI/180, w/h, 1, 5000);
  if(cam.IDX == 0) pg.clear();


  pg.ambientLight(255);
  pg.pointLight(255,255,255,0,-100,100);
  pg.pointLight(255,255,255,0,-100,-100);
  pg.pointLight(255,255,255,0,0,200);
  pg.pointLight(255,255,255,0,0,-200);

  pg.strokeWeight(1);
  pg.stroke(0,200);
  pg.fill(100);
  pg.scale(900);
  pg.model(cosoejez1);

  var value00 = map(sin(frameCount*0.01),-1,1,0,0.1);

  pg.translate(0,value00,0);
  pg.model(cosoejez2);
  pg.pop();
}

if(state === 6){
  pg.push();
  pg.translate(0,100,0);
  pg.rotateX(PI);
  pg.rotateY(PI+PI/2);
  pg.noStroke();
  pg.perspective(60 * PI/180, w/h, 1, 5000);
  if(cam.IDX == 0) pg.clear();


  pg.ambientLight(255);
  pg.pointLight(255,255,255,0,-100,100);
  pg.pointLight(255,255,255,0,-100,-100);
  pg.pointLight(255,255,255,0,0,200);
  pg.pointLight(255,255,255,0,0,-200);

  pg.strokeWeight(1);
  pg.stroke(0,200);
  pg.fill(100);
  pg.scale(100);
  pg.model(camaejey);

  var value00 = map(sin(frameCount*0.01),-1,1,-0.7,1);
  var value11 = map(sin(frameCount*0.01),-1,1,-0.1,1);
  pg.translate(0,0,-value00);
  pg.model(cosoejex1);
  pg.translate(value11,0,0);
  pg.model(cosoejex2);
  pg.pop();

}
pg.pop();

}





