function defined(arg) {
  return typeof arg !== typeof undefined;
}

function boundsCheck(val, lower, upper) {
  return val >= lower && val <= upper;
}

function smoothstep(a, b, t) {
  return (b - a) * (3 - t * 2) * t * t + a;
}

function clamp(val, min, max) {
  return (val <= min || val >= max) ? (val <= min ? min : max) : val;
}
function map(val, from, to) {
  return to[0] + ((val - from[0]) / (from[1] - from[0])) * (to[1] - to[0]);
}
function smootherstep(a, b, t) {
  //let c = clamp(t, 0, 1);
  //console.log(c);
  //let c = map(t, [a, b], [0, 1]);

  // t <= 0 : a
  // t >= 1 : b
  // 0 < t < 1 : something between
  let c = t;
  let fac = (c * c * c * (c * (c * 6 - 15) + 10));
  return a + fac * (b - a);
}

class Vec2 {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  clone() {
    return new Vec2(this.x, this.y);
  }

  add(vec) {
    if (defined(vec) && vec instanceof Vec2) {
      this.x += vec.x;
      this.y += vec.y;
    }
  }

  plus(vec) {
    if (defined(vec) && vec instanceof Vec2) {
      return new Vec2(this.x + vec.x, this.y + vec.y);
    }
  }

  sub(vec) {
    if (defined(vec) && vec instanceof Vec2) {
      this.x -= vec.x;
      this.y -= vec.y;
    }
  }

  minus(vec) {
    if (defined(vec) && vec instanceof Vec2) {
      return new Vec2(this.x - vec.x, this.y - vec.y);
    }
  }

  mult(num) {
    this.x *= num;
    this.y *= num;
  }

  times(num) {
    return new Vec2(this.x * num, this.y * num);
  }

  div(num) {
    this.x /= num;
    this.y /= num;
  }

  over(num) {
    return new Vec2(this.x / num, this.y / num);
  }

  dot(vec) {
    if (defined(vec) && vec instanceof Vec2) {
      return this.x * vec.x + this.y * vec.y;
    } else {
      throw Error("Vec2::dot called with non-vector argument");
    }
  }

  perpendicular(right) {
    let d = defined(right) && right === true ? 1 : -1;
    return new Vec2(this.y * d, -this.x * d);
  }

  normalize() {
    let len = 1 / this.len();
    this.x /= len;
    this.y /= len;
  }

  normalized() {
    let len = this.len();
    return new Vec2(this.x / len, this.y / len);
  }

  len() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  lenSq() {
    return this.x * this.x + this.y * this.y;
  }
}

class Line {
  constructor(from, to) {
    this.from = from.clone();
    this.to = to.clone();
  }

  length() {
    return this.to.minus(this.from).len();
  }
}

class GraphicalElement {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.context;
    this.hidden = false;
  }

  hide() {
    this.hidden = true;
  }

  show() {
    this.hidden = false;
  }

  draw() {
    console.log("Called virtual draw() function on " + this);
  }
}

class Canvas {
  constructor(el, width, height) {
    this.el = el;
    this.context = this.el.getContext("2d");
    this.background_color = "#555555";
    this.width = width;
    this.height = height;
    this.elements = [];
    this.time = 0;
    this.background_image = null;
    this.perlin = null;
    this.animate_perlin = false;
    this.perlin_z = 0;
    this.anim_dir = 1;
    this.anim_speed = 0.1;
    this.show_hud = false;

    this.bindEventHandlers();
  }

  bindEventHandlers() {
    this.el.addEventListener("click", this.onClick.bind(this));
  }

  onClick(e) {
    this.toggleHUD();
  }

  toggleHUD() {
    this.show_hud = !this.show_hud;
  }

  addElement(element) {
    if (defined(element) && element instanceof GraphicalElement) {
      this.elements.push(element);
    }
  }
  
  animatePerlin(perlin) {
    this.perlin = perlin;
    this.animate_perlin = true;
  }

  stopPerlin() {
    this.animate_perlin = false;
  }

  flipAnimDir() {
    if (this.anim_dir > 0) {
      this.anim_dir = -1;
    }
    else {
      this.anim_dir = 1;
    }
  }

  setImage(img) {
    this.background_image = img;
  }

  setAnimSpeed(spd) {
    this.anim_speed = spd;
  }

  getImageData() {
    let ctx = this.context;
    return ctx.createImageData(ctx.getImageData(0, 0, this.width, this.height));
  }

  drawLoop(t) {
    let dt = defined(t) ? t - this.time : 0;
    this.time = defined(t) ? t : 0;
    let ctx = this.context;

    if (this.perlin && this.animate_perlin) {
      this.perlin_z += this.anim_dir * this.anim_speed;
      if (this.perlin_z <= 0 || this.perlin_z >= this.perlin.size - 2) {
        if (this.perlin_z <= 0) {
          this.perlin_z = 0;
        }
        else {
          this.perlin_z = this.perlin.size - 2;
        }
        this.flipAnimDir();
      }
      let img = this.perlin.generateImage(cdata, this.perlin_z);
      ctx.putImageData(img, 0, 0);
    }
    else if (!this.background_image) {
      ctx.fillStyle = this.background_color;
      ctx.fillRect(0, 0, this.width, this.height);
    } else {
      ctx.putImageData(this.background_image, 0, 0);
    }

    for (let el of this.elements) {
      if (!el.hidden) {
        el.draw();
      }
    }

    if (this.show_hud) {
      ctx.font = "bold 35px sans-serif";
      ctx.fillStyle = "green"; //
      let fps = (1000 / dt).toFixed(0);
      ctx.fillText("Width : " + this.width + ", Height: " + this.height, 10, 30);
      ctx.fillText("FPS: " + fps, 10, 60);
      if (this.perlin && this.animate_perlin) {
        ctx.fillText("Perlin z: " + this.perlin_z.toFixed(2), 10, 90);
      }
    }

    window.requestAnimationFrame(this.drawLoop.bind(this));
  }

  drawLine(from, to) {
    let ctx = this.context;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  drawLines(lines, in_view_coords, width, style) {
    if (typeof in_view_coords === "undefined" || !in_view_coords) {
      lines = this.translateCoordsArray(lines);
    }
    let ctx = this.context;
    if (typeof width !== "undefined") {
      ctx.lineWidth = width;
    }
    if (typeof style !== "undefined") {
      ctx.strokeStyle = style;
    }
    ctx.beginPath();
    for (let line of lines) {
      ctx.moveTo(line.from.x, line.from.y);
      ctx.lineTo(line.to.x, line.to.y);
    }
    ctx.stroke();
  }
}

class Grid extends GraphicalElement {
  constructor(canvas, n, m, style = "blue", width = 3) {
    if (!defined(canvas)) {
      throw Error("Please provide reference to canvas");
    }
    super(canvas);
    this.style = style;
    this.width = width;
    this.n = n; // n and m represent the rows and columns
    this.m = m; // ... instead of vertical and horizontal dividing lines
    this.graphical_lines_horiz = [];
    this.graphical_lines_vert = [];
    this.recalc_count = 0;
    this.block = false;
  }

  draw() {
    if (this.block) {
      return;
    }
    // index from 1 to go from rows/columns to lines in between
    // only construct these line elements to draw with whenever the number of lines has changed
    if (this.graphical_lines_horiz.length !== this.n - 1) {
      this.graphical_lines_horiz = [];
      let sep = this.canvas.height / this.n;
      for (let i = 1; i < this.n; ++i) {
        let u = sep * i;
        this.graphical_lines_horiz.push(new Line(new Vec2(0, u), new Vec2(this.canvas.width, u)));
      }
      this.recalc_count++;
      //console.log("recalc horiz lines");
      if (this.recalc_count > 10) {
        this.block = true;
      }
    }
    if (this.graphical_lines_vert.length !== this.m - 1) {
      let sep = this.canvas.width / this.m;
      for (let j = 1; j < this.m; ++j) {
        let v = sep * j;
        this.graphical_lines_vert.push(new Line(new Vec2(v, 0), new Vec2(v, this.canvas.height)));
      }
      //console.log("recalc vert lines");
      if (this.recalc_count > 10) {
        this.block = true;
      }
    }
    this.canvas.drawLines(this.graphical_lines_horiz, true, this.width, this.style);
    this.canvas.drawLines(this.graphical_lines_vert, true, this.width, this.style);
  }
}

class Arrow extends GraphicalElement {
  constructor(canvas, pos, dir, len = 50, width = 2, color = "red", headsize = 10) {
    super(canvas);
    this.pos = pos;
    this.dir = dir.normalized();
    this.len = len;
    this.end = this.pos.plus(this.dir.times(this.len));
    this.right = dir.perpendicular(true);
    this.width = width;
    this.color = color;
    this.headsize = headsize;
    this.linecache = [];
    this.refreshLineCache();
  }

  refreshLineCache() {
    let s = this.headsize;
    let side = this.right.times(-s);
    let head = this.dir.times(this.headsize);
    let mainline = new Line(this.pos, this.end);
    let leftline = new Line(this.end, this.end.minus(head).minus(side));
    let rightline = new Line(this.end, this.end.minus(head).plus(side));
    this.linecache = [mainline, leftline, rightline];
    //console.log("refreshLineCache");
  }

  draw() {
    this.canvas.drawLines(this.linecache, true, this.width, this.color);
  }
}

class Perlin {
  constructor(canvas, m, n, size_3d) {
    this.canvas = canvas;
    this.m = m;
    this.n = n;
    this.grid = null;
    this.arrows = [];
    this.grid_3d = [[[]]];
    /*
    grid = [
      z1 = [ y1 = [ x1 = val(z1, y1, x1), x2, x3, ..., xn], y2, y3, ..., yn], 
      z2 = [...], 
      z3 = [...],
      ...,
      zn]
    */
    this.scale = 1;
    this.size = size_3d;
    this.initialized_2d = false;
    this.initialized_3d = false;
  }

  setScale(scale) {
    this.scale = scale;
  }

  init() {
    let grid = new Grid(canvas, this.m, this.n, undefined, 1);
    this.canvas.addElement(grid);
    this.grid = grid;
    //grid.hide();
    let wsep = this.canvas.width / this.n;
    let hsep = this.canvas.height / this.m;
    //console.log(wsep, hsep);
    for (let j = 1; j < this.m; ++j) {
      for (let i = 1; i < this.n; ++i) {
        let p = new Vec2(wsep * i, hsep * j);
        let d = new Vec2(2 * Math.random() - 1, 2 * Math.random() - 1);
        let arrow = new Arrow(canvas, p, d.normalized(), Math.sqrt(2) * wsep * 0.5);
        this.canvas.addElement(arrow);
        this.arrows.push(arrow);
        //arrow.hide();
      }
    }
    //console.log("init perlin");
    this.initialized_2d = true;
  }

  init3d() {
    for (let i = 0; i < this.size; ++i) {
      for (let j = 0; j < this.size; ++j) {
        for (let k = 0; k < this.size; ++k) {
          if (!defined(this.grid_3d[i])) {
            this.grid_3d[i] = [];
          }
          if (!defined(this.grid_3d[i][j])) {
            this.grid_3d[i][j] = [];
          }
          let x = 2 * Math.random() - 1;
          let y = 2 * Math.random() - 1;
          let z = 2 * Math.random() - 1;
          let len = Math.sqrt(x * x + y * y + z * z);
          x /= len;
          y /= len;
          z /= len;
          this.grid_3d[i][j][k] = [x, y, z];//new Vec2(2 * Math.random() - 1, 2 * Math.random() - 1).normalize();
        }
      }
    }
    this.initialized_3d = true;
  }

  generateImage(img_data, z) {
    let data = img_data.data;
    let purple = [255, 0, 255];
    let gray = [255, 255, 255];
    let green = [0, 255, 0];
    let xscale = img_data.height > img_data.width ? img_data.width / img_data.height : 1;
    let yscale = img_data.height < img_data.width ? img_data.height / img_data.width : 1;
    xscale /= this.scale;
    yscale /= this.scale;
    //console.log(xscale, yscale);
    for (let j = 0; j < img_data.height; ++j) {
      //console.log("column " + i);
      for (let i = 0; i < img_data.width; ++i) {
        let val = 0;
        if (this.initialized_3d && defined(z) && z >= 0 && z < this.size) {
          let margin =  (this.size / (this.size + 2));
          let x = margin * (this.size * xscale * i) / img_data.width;
          let y = margin * (this.size * yscale * j) / img_data.height;
          val = this.sample3d(x, y, z);
        } else if (this.initialized_2d) {
          val = this.sample(i, j);
        } else {
          console.log("shit");
          return;
        }
        let pixel_ind = j * img_data.width + i;
        let r_ind = 4 * pixel_ind;
        let g_ind = 4 * pixel_ind + 1;
        let b_ind = 4 * pixel_ind + 2;
        let a_ind = 4 * pixel_ind + 3;
        if (defined(val)) {
          if (val < 0) {
            data[r_ind] = purple[0] + (val + 1) * (gray[0] - purple[0]);
            data[g_ind] = purple[1] + (val + 1) * (gray[1] - purple[1]);
            data[b_ind] = purple[2] + (val + 1) * (gray[2] - purple[2]);
          } else {
            data[r_ind] = gray[0] + val * (green[0] - gray[0]);
            data[g_ind] = gray[1] + val * (green[1] - gray[1]);
            data[b_ind] = gray[2] + val * (green[2] - gray[2]);
          }
          data[a_ind] = 255;
        } else {
          data[r_ind] = 32;
          data[g_ind] = 32;
          data[b_ind] = 32;
          data[a_ind] = 255;
        }
      }
    }
    return img_data;
  }

  sample(x, y) {
    let wsep = this.canvas.width / this.n;
    let hsep = this.canvas.height / this.m;
    let clickpos = new Vec2(x, y);
    if (x > wsep && x < this.canvas.width - wsep && y > hsep && y < this.canvas.height - hsep) {
      let i = Math.floor(x / wsep) - 1;
      let j = Math.floor(y / hsep) - 1;

      let arr1 = this.arrows[j * (this.n - 1) + i];
      let arr2 = this.arrows[j * (this.n - 1) + i + 1];
      let arr3 = this.arrows[(j + 1) * (this.n - 1) + i];
      let arr4 = this.arrows[(j + 1) * (this.n - 1) + i + 1];
      if (!arr1 || !arr2 || !arr3 || !arr4) {
        return;
      }
      let diff1 = clickpos.minus(arr1.pos).over(wsep);
      let diff2 = clickpos.minus(arr2.pos).over(wsep);
      let diff3 = clickpos.minus(arr3.pos).over(wsep);
      let diff4 = clickpos.minus(arr4.pos).over(wsep);
      let dot1 = diff1.dot(arr1.dir);
      let dot2 = diff2.dot(arr2.dir);
      let dot3 = diff3.dot(arr3.dir);
      let dot4 = diff4.dot(arr4.dir);
      let interp_top = smootherstep(dot1, dot2, diff1.x);
      let interp_bot = smootherstep(dot3, dot4, diff3.x);
      let value = smootherstep(interp_top, interp_bot, diff1.y);
      return value;
    } else {
      return undefined;
    }
  }

  sample3d(x, y, z) {
    if (boundsCheck(x, 0, this.size - 1) && boundsCheck(y, 0, this.size - 1) && boundsCheck(z, 0, this.size - 1)) {
      let i = Math.floor(x);
      let j = Math.floor(y);
      let k = Math.floor(z);
      let dot = (x1, y1, z1, x2, y2, z2) => { return x1 * x2 + y1 * y2 + z1 * z2; };
      let elements = [
        this.grid_3d[i    ][j    ][k    ],
        this.grid_3d[i + 1][j    ][k    ],
        this.grid_3d[i    ][j + 1][k    ],
        this.grid_3d[i + 1][j + 1][k    ],
        this.grid_3d[i    ][j    ][k + 1],
        this.grid_3d[i + 1][j    ][k + 1],
        this.grid_3d[i    ][j + 1][k + 1],
        this.grid_3d[i + 1][j + 1][k + 1]
      ];
      let dots = [
        dot(x - i      , y - j      , z - k      , elements[0][0], elements[0][1], elements[0][2]),
        dot(x - (i + 1), y - j      , z - k      , elements[1][0], elements[1][1], elements[1][2]),
        dot(x - i      , y - (j + 1), z - k      , elements[2][0], elements[2][1], elements[2][2]),
        dot(x - (i + 1), y - (j + 1), z - k      , elements[3][0], elements[3][1], elements[3][2]),
        dot(x - i      , y - j      , z - (k + 1), elements[4][0], elements[4][1], elements[4][2]),
        dot(x - (i + 1), y - j      , z - (k + 1), elements[5][0], elements[5][1], elements[5][2]),
        dot(x - i      , y - (j + 1), z - (k + 1), elements[6][0], elements[6][1], elements[6][2]),
        dot(x - (i + 1), y - (j + 1), z - (k + 1), elements[7][0], elements[7][1], elements[7][2]),
      ];
      let interp_front_top = smootherstep(dots[0], dots[1], x - i);
      let interp_front_bot = smootherstep(dots[2], dots[3], x - i);
      let interp_back_top = smootherstep(dots[4], dots[5], x - i);
      let interp_back_bot = smootherstep(dots[6], dots[7], x - i);
      let interp_front = smootherstep(interp_front_top, interp_front_bot, y - j);
      let interp_back = smootherstep(interp_back_top, interp_back_bot, y - j);
      let value = smootherstep(interp_front, interp_back, z - k);
      return value;
    }
    else {
      return undefined;
    }
  }
}

//console.time("init_elements");
let canvas_element = document.getElementById("canvas");
let width_exp = Math.floor(Math.log2(Math.min(512, window.innerWidth)));
let height_exp = Math.floor(Math.log2(Math.min(512, window.innerHeight)));
let width_power_of_two = Math.pow(2, width_exp);
let height_power_of_two = Math.pow(2, height_exp);
canvas_element.width = width_power_of_two;
canvas_element.height = height_power_of_two;
let slots_w = Math.floor(Math.pow(2, Math.floor(Math.log2(Math.log2(width_power_of_two)))));
let slots_h = slots_w * Math.round(width_power_of_two / height_power_of_two);

let canvas = new Canvas(canvas_element, width_power_of_two, height_power_of_two);
let perlin = new Perlin(canvas, slots_w, slots_h, 16);
//console.timeEnd("init_elements");
canvas.show_hud = true;

let cdata = canvas.getImageData();

let mode = 1;
if (mode === 0) {
  //console.time("perlin");
  perlin.init();
  canvas.setImage(perlin.generateImage(cdata));
  //console.timeEnd("perlin");
}
else if (mode === 1) {
  perlin.init3d();
  perlin.setScale(1);
  canvas.animatePerlin(perlin);
  canvas.setAnimSpeed(0.033);
}

canvas.drawLoop();
