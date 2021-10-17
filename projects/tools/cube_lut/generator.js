// TODO: grep this file for TODOs and address them

const n = 4;
const WIDTH = 256 * n;
const HEIGHT = 256 * n;
// TODO move these into the root class

class ControlPoint {
    // ind: lattice coords, pos: image coords, color: uint32
    constructor(ind_i, ind_j, pos_x, pos_y, color) {
        this.radius = 5;
        this.radius_limits = {
            min : 5,
            max : 15
        }
        this.ind = {
            i : ind_i,
            j : ind_j
        };
        this.pos = {
            x : pos_x,
            y : pos_y
        };
        this.color = color;

        // resist the temptation to add a reference to parent here
        // I think that could maybe break GC and these guys are newed and forgotten constantly
        // honestly I have no idea how GC works with all this class syntactic sugar
        // could be totally fine if it's smart enough...

        this.animating = false;
        this.timer = null;
        this.dir = 0;
    }

    animateRadius() {
        let dir = this.dir;
        let done = dir > 0 ? this.radius >= this.radius_limits.max : this.radius <= this.radius_limits.min;
        if (!done) {
            this.radius += dir;
            if (this.timer) clearTimeout(this.timer);
            this.timer = setTimeout(this.animateRadius.bind(this, dir), 0);
        }
    }

    mouseEnter() {
        this.dir = 1;
        this.animateRadius();
    }

    mouseLeave() {
        this.dir = -1;
        this.animateRadius();
    }

    intersects(x, y) {
        let dx = this.pos.x - x;
        let dy = this.pos.y - y;
        return dx * dx + dy * dy < this.radius * this.radius;
    }

    setColor(color) {
        this.color = color;
    }

    draw(ctx) {
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.ellipse(this.pos.x, this.pos.y, this.radius + 2, this.radius + 2, 0, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = this.colorHexStrFromInt(this.color);
        ctx.beginPath();
        ctx.ellipse(this.pos.x, this.pos.y, this.radius, this.radius, 0, 0, 2 * Math.PI);
        ctx.fill();
    }

    colorHexStrFromInt(color_int) {
        let r = (color_int & 0x0000ff);
        let g = (color_int & 0x00ff00) >>> 8;
        let b = (color_int & 0xff0000) >>> 16;
        return "#" + r.toString(16).padStart(2, "0") 
                   + g.toString(16).padStart(2, "0") 
                   + b.toString(16).padStart(2, "0");
    }
}

class ColorLattice {
    constructor(parent, size) {
        this.control_points = null; // control points are just UI that provide access to this color map
                                    // control points exist for the currently selected layer and are 
                                    // rebuilt when the layer changes
        this.colors = new Map(); // the actual lattice is n*n*n, where n is the .cube LUT resolution
                                 // the underlying data is updated when control points are interacted with
        this.size = size; // size is what resolution is called inside this class
        this.parent = parent; // alias for ColorCanvas (which should be renamed anyway) (TODO)
        this.hovered_control_point = null;
    }

    init() {
        this.rebuildControlPoints();
    }

    onClick(x, y, btn) {
        let cp = this.getControlPointAt(x, y);
        let changed = false;
        if (cp) {
            let color = 0;
            if (btn === 1) {
                color = this.parent.colorIntFromHexStr(this.parent.output_color);
            }
            else if (btn === 3) {
                let sx = Math.floor((256 - 1) * (cp.ind.i / (this.size - 1)));
                let sy = Math.floor((256 - 1) * (cp.ind.j / (this.size - 1)));
                color = this.parent.getSourceColor(sx, sy, this.parent.layer);
            }
            changed = this.setControlPointColor(cp, this.parent.layer, color);
        }
        return changed;
    }

    onMouseMove(x, y) {
        let pt = this.getControlPointAt(x, y);
        if (this.hovered_control_point && this.hovered_control_point !== pt) {
            this.hovered_control_point.mouseLeave();
            this.hovered_control_point = null;
        }
        if (pt && pt !== this.hovered_control_point) {
            pt.mouseEnter();
            this.hovered_control_point = pt;
        }
    }

    onMouseLeave(x, y) {
        if (this.hovered_control_point) {
            this.hovered_control_point.mouseLeave();
            this.hovered_control_point = null;
        }
    }

    resize(size) {
        this.size = size;
        this.colors = new Map(); 
        // resizing invalidates the data since the control points don't match
        // there's a different number of them and they (at least mostly) don't line up
        this.rebuildControlPoints();
    }

    setControlPointColor(control_point, layer, color) {
        let changed = control_point.color !== color;
        control_point.color = color;
        this.colors.set(this.computeMapKey(control_point.ind.i, control_point.ind.j, layer), color);
        return changed;
    }

    // called on init or layer change
    rebuildControlPoints() {
        let w = this.parent.canvas.width;
        let h = this.parent.canvas.height;
        this.control_points = [];
        let size = this.size;
        for (let i = 0; i < size; ++i) {
            this.control_points[i] = [];
            for (let j = 0; j < size; ++j) {
                let color = null;
                let map_key = this.computeMapKey(i, j, this.parent.layer);
                // when rebuilding the lattice, check the color data
                // if user hasn't set it color the control point with the input/source/base/default color
                if (this.colors.has(map_key)) {
                    color = this.colors.get(map_key);
                }
                else {
                    let sx = Math.floor((256 - 1) * (i / (size - 1)));
                    let sy = Math.floor((256 - 1) * (j / (size - 1)));
                    // getSourceColor uses the 256^3 raw colors of the source cube
                    // not sure if I should be sampling this cube or even store it in the first place
                    // since it's pretty easy to construct these color values on demand (it's just a cube with RGB axes)
                    // see buildInputCube (TODO maybe sort this out)
                    color = this.parent.getSourceColor(sx, sy, this.parent.layer);
                }
                // figure out the x and y coordinates of where this control point should be in image coords
                // given that the corners of the lattice line up with the corners of the image
                // and the rest of the control points are evenly spaced in between
                let x = (w - 1) * (i / (size - 1));
                let y = (h - 1) * (j / (size - 1));
                this.control_points[i][j] = new ControlPoint(i, j, x, y, color);
            }
        }
    }

    drawControlPoints() {
        for (let cp_row of this.control_points) {
            for (let cp of cp_row) {
                cp.draw(this.parent.ctx);
            }
        }
    }

    // x, y are image coords [0 ... 256 * n]
    getControlPointAt(x, y) {
        let intersecting = null;
        top:
        for (let cp_row of this.control_points) {
            for (let cp of cp_row) {
                if (cp.intersects(x, y)) {
                    intersecting = cp;
                    break top;
                }
            }
        }
        return intersecting;
    }

    computeMapKey(i, j, k) {
        return i << 16 | j << 8 | k >>> 0;
    }

    print(name) {
        let output = "TITLE \"" + name + "\"\n";
        output += "\n#LUT size\nLUT_3D_SIZE " + this.size + "\n";
        output += "\n#LUT data points\n"
        for (let k = 0; k < this.size; ++k) {
            for (let j = 0; j < this.size; j++) {
                for (let i = 0; i < this.size; ++i) {
                    let key = this.computeMapKey(i, j, k);
                    let color = 0;
                    if (this.colors.has(key)) {
                        color = this.colors.get(this.computeMapKey(i, j, k));
                    }
                    else {
                        let sx = Math.floor((256 - 1) * (i / (this.size - 1)));
                        let sy = Math.floor((256 - 1) * (j / (this.size - 1)));
                        let sz = Math.floor((256 - 1) * (k / (this.size - 1)));
                        color = this.parent.getSourceColor(sx, sy, sz);
                    }
                    let r = (color & 0x0000ff);
                    let g = (color & 0x00ff00) >>> 8;
                    let b = (color & 0xff0000) >>> 16;
                    let rs = (r / 255).toFixed(6);
                    let gs = (g / 255).toFixed(6);
                    let bs = (b / 255).toFixed(6);
                    output += rs + " " + gs + " " + bs + "\n";
                }
            }
        }
        return output;
    }
}

// TODO rename this to represent what it has evolved to
class ColorCanvas {
    constructor() {
        this.canvas = document.querySelector("canvas");
        this.ctx = this.canvas.getContext("2d");
        this.canvas.width = WIDTH;
        this.canvas.height = HEIGHT;

        this.input_cube = new ArrayBuffer(256 * 256 * 256 * 4);
        this.raw_buffer = new ArrayBuffer(256 * 256 * 256 * 4);
        this.cached_background = new Uint32Array(WIDTH * HEIGHT);
        //this.raw_buffer_hsl = new ArrayBuffer(100 * 100 * 360 * 4);
        this.layer = 0;

        this.layer_slider = document.getElementById("blue-slider");

        this.resolution_select = document.getElementById("resolution-select");
        this.resolution = parseInt(this.resolution_select.value, 10);
        this.layer_slider.step = 255 / this.resolution;

        //let input_color_el = document.getElementById("input-color");
        this.output_color_el = document.getElementById("output-color");
        this.input_color = "#ff2200";//input_color_el.value;
        this.output_color = this.output_color_el.value;
        //input_color_el.addEventListener("change", (e) => { this.input_color = e.target.value; this.updateCanvas(); });

        this.draw_res_select = document.getElementById("resolution-grid-checkbox");
        this.draw_resolution_grid = this.draw_res_select.checked;

        this.selection_map = null;

        this.color_lattice = null;
    }

    init() {
        //this.clearSelectionMap();

        //this.setColorData();
        //this.bindHandlers();
        //this.updateCanvas();

        this.bindHandlers();
        this.buildInputCube();

        this.color_lattice = new ColorLattice(this, this.resolution);
        this.color_lattice.init();

        this.updateBackground();
        //this.colorControlPoints();

        this.draw();
    }

    buildInputCube() {
        let color_view = new Uint32Array(this.input_cube);
        for (let i = 0; i < color_view.length; ++i) {
            let r = i % 256;
            let g = Math.floor(i / 256) % 256;
            let b = Math.floor(i / 65536) % 256;
            let int = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
            color_view[i] = int;
        }
    }

    getSourceColor(x, y, z) {
        let pixel_view = new Uint32Array(this.input_cube);
        return pixel_view[(z * 256 * 256) + y * 256 + x];
    }

    // recalculate the cached background image, which is interpolated from the control point lattice
    // called when control points change or layer changes
    updateBackground() {
        // resolution 4:
        // 3 regions
        //  _________________
        // |o 1  o  2  o  3 o|
        // |                 |
        // |o    o     o    o|
        // | [x]             |
        // |o    o     o    o|
        // |                 |
        // |o____o_____o____o|
        // [x] is at i_0 = 0, i_1 = 1, j_0 = 1, j_1 = 2
        // i.e. control points are (horiz, vert):
        // top left: (0, 1)
        // top right: (1, 1)
        // bottom left: (1, 2)
        // bottom right: (2, 2)

        // iterate over 256*256 entries in the underlying color cube layer and scale it up
        // may introduce banding or some other nonsense because things don't land exactly on integer values
        // TODO: test running this over all 256*n x 256*n background pixels explicitly instead of duplicating
        // and see how much slower it is to do all that extra interp and if there's a change in image quality
        for (let y = 0; y < 256; ++y) {
            for (let x = 0; x < 256; ++x) {
                // each segment influenced by 2 control points,
                // so resolution -1 because we're looking at inbetweens
                let segment_size = 256 / (this.resolution - 1);
                let i0 = Math.floor(x / segment_size); // left control point index
                let i1 = i0 + 1; // right index
                let j0 = Math.floor(y / segment_size); // top
                let j1 = j0 + 1; // bottom
                // TODO build all this interp and lookup into ColorLattice instead of breaking encapsulation here
                let top_left = this.color_lattice.control_points[i0][j0];
                let top_right = this.color_lattice.control_points[i1][j0];
                let bot_left = this.color_lattice.control_points[i0][j1];
                let bot_right = this.color_lattice.control_points[i1][j1];
                let u = (x % segment_size) / segment_size; // horizontal interp param
                let v = (y % segment_size) / segment_size; // vertical interp param
                // TODO: I think the cube LUT spec talks about tetrahedral interp and I'm using trilinear here
                // which means the visualization the user sees in this interface is not entirely accurate
                // (Well, actually I'm using bilinear since we're always exactly coplanar with 
                //  a set of control points in the Z-axis and therefore don't need to interpolate in that dimension)
                let top_color = this.interpColors(top_left.color, top_right.color, u);
                let bot_color = this.interpColors(bot_left.color, bot_right.color, u);
                let color = this.interpColors(top_color, bot_color, v);

                // line/column: iterate over n*n additional copies into scaled target
                for (let line_duplicate = 0; line_duplicate < n; ++line_duplicate) {
                    for (let column_duplicate = 0; column_duplicate < n; ++column_duplicate) {
                        // base is offset in target, computed as filled rows above plus the offset along the current row
                        // scale factor is number of pixels in target per number of pixels in source
                        // row offset is offset along the row in the target image, which is source row times n
                        let full_rows = y * 256;
                        let scale_factor = n * n;
                        let row_offset = x * n;
                        let target_base = full_rows * scale_factor + row_offset;
                        let target_index = target_base + WIDTH * line_duplicate + column_duplicate;
                        this.cached_background[target_index] = color;
                    }
                }
            }
        }
    }

    draw() {
        let ctx = this.ctx;
        // draw background
        let bg_raw = new Uint8ClampedArray(this.cached_background.buffer, 0, this.cached_background.buffer.byteLength);
        this.ctx.putImageData(new ImageData(bg_raw, WIDTH, HEIGHT), 0, 0);

        // draw grid
        if (this.draw_resolution_grid) {
            let drawGrid = () => {
                // from 1 because we're drawing lines between the bins instead of the bins themselves
                for (let i = 1; i < this.resolution - 1; ++i) {
                    let s = i * (WIDTH / (this.resolution - 1));

                    ctx.beginPath();
                    ctx.moveTo(s, 0);
                    ctx.lineTo(s, HEIGHT);
                    ctx.stroke();
                    
                    ctx.beginPath();
                    ctx.moveTo(0, s);
                    ctx.lineTo(WIDTH, s);
                    ctx.stroke();
                }
            };
            ctx.setLineDash([1, 1]);
            ctx.lineDashOffset = 0;
            ctx.strokeStyle = "black";
            drawGrid();
            ctx.strokeStyle = "white";
            ctx.lineDashOffset = 10;
            drawGrid();
        }

        // draw control points
        this.color_lattice.drawControlPoints();
        
        // TODO: maybe pause/unpause this loop based on whether something is actually changing or not
        window.requestAnimationFrame(this.draw.bind(this));
    }

    updateCanvas() {
        let pixel_view = new Uint32Array(this.raw_buffer);
        let scaled_pixels = new Uint32Array(WIDTH * HEIGHT);
        let layer_size = 256 * 256;
        let layer_offset = this.layer * layer_size;
        let target_row_width = WIDTH;
        let in_color = Number("0x" + this.input_color.slice(1));
        let r = (in_color & 0xff0000) >>> 16;
        let g = (in_color & 0x00ff00) >>> 8;
        let b = (in_color & 0x0000ff);
        let test_color = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
        let out_color = Number("0x" + this.output_color.slice(1));
        let out_color_uint32 = ((255 << 24) | 
                               (out_color & 0x0000ff) << 16 | 
                               ((out_color & 0x00ff00) >>> 8) << 8 |
                               ((out_color & 0xff0000) >>> 16)) >>> 0;
        //let inverse_color = (((255 - r) << 16) | ((255 - g) << 8) | (255 - b)) >>> 0;
        let tgt_corner = {};
        let match = false;
        for (let u = 0; u < 256; ++u) { // u, v: iterate over pixels in source
            for (let v = 0; v < 256; ++v) {
                let source_index = u * 256 + v;
                let pixel_to_write = pixel_view[layer_offset + source_index];
                let key = this.computeMapKey(v, u, this.layer);
                if (this.selection_map.has(key)) {
                    pixel_to_write = out_color_uint32;
                }
                if (pixel_to_write == test_color) {
                    match = true;
                    tgt_corner.x = v * n;
                    tgt_corner.y = u * n;
                }
                for (let line_duplicate = 0; line_duplicate < n; ++line_duplicate) { // line/column: iterate over n*n additional copies into scaled target
                    for (let column_duplicate = 0; column_duplicate < n; ++column_duplicate) {
                        // base is offset in target, computed as filled rows above plus the offset along the current row
                        // scale factor is number of pixels in target per number of pixels in source
                        // row offset is offset along the row in the target image, which is source row times n
                        let full_rows = u * 256;
                        let scale_factor = n * n;
                        let row_offset = v * n;
                        let target_base = full_rows * scale_factor + row_offset;
                        let target_index = target_base + target_row_width * line_duplicate + column_duplicate;
                        scaled_pixels[target_index] = pixel_to_write;
                    }
                }
            }
        }
        let image_raw = new Uint8ClampedArray(scaled_pixels.buffer, 0, scaled_pixels.buffer.byteLength);
        this.ctx.putImageData(new ImageData(image_raw, WIDTH, HEIGHT), 0, 0);

        if (match) {
            this.ctx.fillStyle = this.output_color;//"#" + inverse_color.toString(16).padStart(6, "0");
            this.ctx.fillRect(tgt_corner.x, tgt_corner.y, n, n);
        }

        if (this.draw_resolution_grid) {
            let drawGrid = () => {
                // from 1 because we're drawing lines between the bins instead of the bins themselves
                for (let i = 1; i < this.resolution; ++i) {
                    this.ctx.beginPath();
                    let s = i * (WIDTH / this.resolution);
                    this.ctx.moveTo(s, 0);
                    this.ctx.lineTo(s, HEIGHT);
                    this.ctx.stroke();
                    
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, s);
                    this.ctx.lineTo(WIDTH, s);
                    this.ctx.stroke();
                }
            };
            this.ctx.setLineDash([1, 1]);
            this.ctx.lineDashOffset = 0;
            this.ctx.strokeStyle = "black";
            drawGrid();
            this.ctx.strokeStyle = "white";
            this.ctx.lineDashOffset = 10;
            drawGrid();
        }
    }

    clearSelectionMap() {
        this.selection_map = new Map();
    }

    setColorData() {
        let color_view = new Uint32Array(this.raw_buffer);
        //let color_view_hsl = new Uint32Array(this.raw_buffer_hsl);
        for (let i = 0; i < color_view.length; ++i) {
            let r = i % 256;
            let g = Math.floor(i / 256) % 256;
            let b = Math.floor(i / 65536) % 256;
            let int = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
            color_view[i] = int;
        }
    }

    bindHandlers() {
        this.canvas.addEventListener("wheel", this.onWheel.bind(this), { passive : true });
        this.canvas.addEventListener("mouseup", this.onClick.bind(this));

        this.layer_slider.addEventListener("input", (e) => { 
            this.layer = parseInt(e.target.value, 10); 
            this.onLayerChange();
            //this.updateCanvas(); 
        });

        // this.resolution_select.addEventListener("change", (e) => { 
        //     this.resolution = parseInt(this.resolution_select.value, 10);
        //     this.layer_slider.step = 255 / this.resolution;
        //     this.layer = parseInt(this.layer_slider.value, 10);
        //     this.updateCanvas();
        // });
        this.resolution_select.addEventListener("change", this.onResolutionChange.bind(this));

        this.output_color_el.addEventListener("change", (e) => { 
            this.output_color = e.target.value; 
            //this.updateCanvas(); 
        });

        this.draw_res_select.addEventListener("change", (e) => { 
            this.draw_resolution_grid = e.target.checked; 
            //this.updateCanvas(); 
        });
        
        this.canvas.addEventListener("mousemove", this.onMouseMove.bind(this));
        this.canvas.addEventListener("mouseleave", this.onMouseLeave.bind(this));

        document.getElementById("print-button").addEventListener("click", this.print.bind(this));
    }

    onLayerChange() {
        // re-color control points
        this.color_lattice.rebuildControlPoints();
        // re-cache background
        this.updateBackground();
    }

    onResolutionChange() {
        this.resolution = parseInt(this.resolution_select.value, 10);
        this.layer_slider.step = 255 / this.resolution;
        let old_layer = this.layer;
        this.layer = parseInt(this.layer_slider.value, 10);
        let layer_changed = old_layer !== this.layer;
        // rebuild control points entirely
        // they're no longer in the same positions so the whole XYZ lattice is invalidated
        // (not just the control points)
        // TODO: look into maybe re-interpreting the previous data in the new lattice to get an approximate equivalent?
        this.color_lattice.resize(this.resolution);
        if (layer_changed) {
            this.updateBackground();
        }
    }

    onWheel(e) {
        //let step = this.layer_slider.step;
        let step = Math.floor(this.layer_slider.step)
        if (e.deltaY > 0) {
            if (this.layer + step < 255) {
                this.layer = this.layer + step;
                this.layer_slider.value = this.layer;
                this.onLayerChange();
                //this.updateCanvas();
            }
        }
        else {
            if (this.layer - step >= 0) {
                this.layer = this.layer - step;
                this.layer_slider.value = this.layer;
                this.onLayerChange();
                //this.updateCanvas();
            }
        }
    }

    onClick(e) {
        // // get click position, hash to key, set selection_map[key] = true
        // // in updateCanvas, draw selected pixels as white or whatever for a first test
        // let ix = e.offsetX;
        // let iy = e.offsetY;
        // let x = Math.floor(ix / n);
        // let y = Math.floor(iy / n);
        // let z = this.layer;
        // //let key = x << 16 | y << 8 | z >>> 0;
        // let key = this.computeMapKey(x, y, z);
        // this.selection_map.set(key, true);
        // console.log(this.selection_map);
        let changed = this.color_lattice.onClick(e.offsetX, e.offsetY, e.which);
        if (changed) {
            this.updateBackground();
        }
    }

    onMouseMove(e) {
        this.color_lattice.onMouseMove(e.offsetX, e.offsetY);
    }

    onMouseLeave(e) {
        this.color_lattice.onMouseLeave(e.offsetX, e.offsetY);
    }

    computeMapKey(x, y, z) {
        return x << 16 | y << 8 | z >>> 0;
    }

    colorIntFromHexStr(str) {
        return Number("0x" + str.slice(1));
    }

    interpColors(a, b, t) {
        if (typeof t !== "number" || t < 0 || t > 1) {
            console.error("ColorCanvas::interpColors called with invalid t parameter (" + t + ")");
            return a;
        }
        let r0 = (a & 0xff0000) >>> 16;
        let g0 = (a & 0x00ff00) >>> 8;
        let b0 = (a & 0x0000ff);

        let r1 = (b & 0xff0000) >>> 16;
        let g1 = (b & 0x00ff00) >>> 8;
        let b1 = (b & 0x0000ff);

        let r2 = r0 + t * (r1 - r0);
        let g2 = g0 + t * (g1 - g0);
        let b2 = b0 + t * (b1 - b0);

        return ( (255 << 24) | (r2 << 16) | (g2 << 8) | b2 ) >>> 0;
    }

    print() {
        let name = document.getElementById("name-input").value;
        let cube_str = this.color_lattice.print(name);

        let a = document.createElement("a");
        let file = new Blob([cube_str], {type: "text/plain"});
        let url = URL.createObjectURL(file);
        a.href = url;
        a.download = name + ".cube";
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);  
        }, 0); 
    }
}

var color_canvas = null;
function main() {
    color_canvas = new ColorCanvas();
    color_canvas.init();
}
window.onload = Promise.resolve().then(main);