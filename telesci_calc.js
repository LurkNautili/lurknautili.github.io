/* Very basic 2D vector implemenetation*/
class Vector2 {
	constructor(x=0, y=0) {
  	this.x = x;
    this.y = y;
  }
  
  dot(v) {
  	return this.x * v.x + this.y * v.y;
  }
  
  normalize() {
  	let l = this.length();
    this.x /= l;
    this.y /= l;
  }
  
  length() {
  	return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
  }
  
  angleTo(v) {
  	let lt = this.length();
    let lv = v.length();
    let dp = this.dot(v);
    let cos_theta = dp / (lt * lv);
    return Math.acos(cos_theta);
  }
  
  /* The only nonstandard function, gets offset from "north" clockwise */
  bearing() {
    // Like your basic unit circle angle from x, y
    // Except clockwise from y-axis instead of anticlockwise from x-axis
    // Simply swap x and y to accomplish that
    // (handedness of coordinate axes and symmetry take care of it)
    let bear = Math.atan2(this.x, this.y);
    if (bear < 0) { bear = Math.PI * 2 + bear}
    return bear;
  }
}

var globals = {
	bearing_offset: 0,
  power_offset: 0,
  canvas: null,
  dragging: false,
  mid_dragging: false,
  drag_start: { 
    cursor: { x: null, y: null }, 
    tile: { x: null, y: null },
    view: { min: { x: 1, y: 1 }, max: { x: 255, y: 255 } }
  },
  m_button: null,
  last_power: 0,
  last_elev: 0,
  source_pos: {sx: 0, sy: 0, sz: 0},
  target_pos: {tx: 0, ty: 0, tz: 0},
  result_pos: {rx: 0, ry: 0, rz: 0},
  map_zoom_level: 0, // 0 - 3 for instance, at 3:32, 6:32, 15:32, 32:32 or something
  view_range: 127,
  map_bounds: { min: { x: 1, y: 1 }, max: { x: 255, y: 255 } }
};

globals.canvas = document.getElementById('telescience_tool');
globals.canvas_context = globals.canvas.getContext('2d');
globals.canvas_context.save();

// Catch clicks and dragging on the canvas for updating coords
$(document).contextmenu(function(e){e.preventDefault();})
$(document).onload(() => {
  drawMap();
  drawSourceTarget();
})
$('canvas').mousedown(function(e) {
	if (e.which == 1) {
  	globals.m_button = 'left';
  }
  else if (e.which == 3) {
  	globals.m_button = 'right';
  }
  else {
  	globals.m_button = 'mid';
  }
	globals.dragging = true;
  let drag_tile = canvasPosToStationCoords(e.offsetX, e.offsetY);
  globals.drag_start = { 
    cursor: { x : e.offsetX, y : e.offsetY }, 
    tile: { x : drag_tile[0], y : drag_tile[1] },
    view: globals.map_bounds
  };
  setPosWithClick(e);
  e.preventDefault();
  e.stopPropagation();
});
$('canvas').mouseup(function(e) { 
	globals.dragging = false;
  e.preventDefault();
  e.stopPropagation();
});
$('canvas').mousemove(function(e) { 
	if (globals.dragging == true) {
  	if (globals.m_button !== 'mid') {
  		setPosWithClick(e);
    }
    else {
    	scrollMap(e);
      drawMap();
      drawSourceTarget();
    }
  }
  e.preventDefault();
  e.stopPropagation();
});
$('canvas').on('wheel', (e) => {
	zoomMap(e);
  drawMap();
  drawSourceTarget();
  e.preventDefault();
  e.stopPropagation();
});

$('input').change(function(e) {
	let id = e.target.id;
	if (id == 'bearing' || id == 'power' || id == 'elevation') {
  	// handle recalculation of projected target based on bearing etc.
    // turns out this isn't super useful to me
    // -> for now, unimplemented as a result
  }
  else if (id == 'source_x' || id == 'source_y' || id == 'source_z' ||
  			   id == 'target_x' || id == 'target_y' || id == 'target_z' ||
           id == 'result_x' || id == 'result_y' || id == 'result_z') {
  	// catch changes in the coordinates and store them in globals
    globals.source_pos.sx = $('#source_x').val();
    globals.source_pos.sy = $('#source_y').val();
    globals.source_pos.sz = $('#source_z').val();
    globals.target_pos.tx = $('#target_x').val();
    globals.target_pos.ty = $('#target_y').val();
    globals.target_pos.tz = $('#target_z').val();
    globals.result_pos.rx = $('#result_x').val();
    globals.result_pos.ry = $('#result_y').val();
    globals.result_pos.rz = $('#result_z').val();
    //Figure out the required settings to land at target
    calculateLanding();
    //Draw some visual aids
    //updateMapImg();
    drawMap();
    drawSourceTarget();
  }
})
$('#source_x').change(); // hacky way to trigger the first draw

$('#calibrate').click(function() {calibrate();calculateLanding();});
$('#toggleOverrideDisp').click(toggleOverrideVisibility);
$('#acceptOverrides').click(setOverrides);

/* This guy figures out how to get to XYZ */
function calculateLanding() {
  let {tx, ty, tz} = globals.target_pos;
  let {sx, sy, sz} = globals.source_pos;
  
  // These are the hidden offsets, zero before calibration
  let p_offset = globals.power_offset;
  let b_offset = globals.bearing_offset;
  
  // Start by constructing a vector from source to target
  let dx = tx - sx;
  let dy = ty - sy;
  let dv = new Vector2(dx, dy);
  
  let dist = dv.length();
  $('#distance').text(Number(dist.toFixed(2)));
  
  // Figure out bearing (offset clockwise from north/fore-ward/positive-Y)
  let bear = dv.bearing();// + b_offset;
  // Display as degrees because that's what the game wants as inputs
  // Remember to take into account the calibration error
  let bear_deg = (bear * 180 / Math.PI) + b_offset;
  bear_deg = bear_deg < 0 ? 360 - bear_deg : bear_deg;
  $('#bearing').val(Number(bear_deg.toFixed(2)));
  
  // Game uses gravitational constant of 10 for trajectories
  let g = 10;
  // Power required to hit target at 45 degree launch angle
  // i.e. the lowest possible power to reach target with
  let exact_power = Math.sqrt(dist * g);
  
  // Game only provides this level of granularity for initial velocity
  let power_levels = [5, 10, 20, 25, 30, 40, 50, 80];
  let discrete_power = -1;
 	for (let l of power_levels) {
  	// Choose lowest power level greater than the minimum required
    // (accounting for offset applied to it so the fraction fed
    //  into the inverse sine below is between -1 and 1)
  	if (l + p_offset > exact_power) {
    	discrete_power = l;
      break;
    }
  }
  if (discrete_power > 0) { // If there's a solution at all
    // Max range with this power setting, accounting for offset:
  	let max_dist = Math.pow(discrete_power + p_offset, 2) / g;
    // launch angle based on how much this power setting is above min:
  	let elev = Math.asin(dist/max_dist) / 2;
    // Display as degrees again:
    let elev_deg = elev * 180 / Math.PI;
    $('#debug_output').text(elev_deg);
    $('#elevation').val(Number(elev_deg.toFixed(1)));
    $('#power').val(discrete_power);
    // These have to be stored to figure out the offsets in calibration
    globals.last_elev = elev;
    globals.last_power = discrete_power;
  }
  else { // If the power needed exceeds all settings
  	$('#power').val('NO SOLUTION');
    // AFAIK, this clause will only be reached if you aim too far
    // max range is over 600 squares so this will never happen in practice
    // but we want to catch erroneous input
    $('#elevation').val('TOO FAR');
  }
}

/* 
		This function calculates offsets, displays them and sets them in globals
    
		The game will have some hidden offsets for bearing and power,
    so we have to calculate those based on where the telepad sends us
    vs. where it was supposed to send us.
*/
function calibrate() {
	resetCalibration()
  let {tx, ty, tz} = globals.target_pos; 
  let {sx, sy, sz} = globals.source_pos;
  let {rx, ry, rz} = globals.result_pos; 
  
  // Power and elevation (initial velocity and launch angle)
  // that were used to end up at result_pos, when aiming at target_pos
  let p_used = globals.last_power;
  let e_used = globals.last_elev;
  
  // vector: source -> target
  let tv = new Vector2(tx - sx, ty - sy);
  // vector: source -> actual landing spot
  let rv = new Vector2(rx - sx, ry - sy);
  
  // error in distance resulting from error in initial velocity
  let d_err = rv.length() - tv.length();
  
  // Figure out what the power offset must be, given the elevation we used,
  // the power level we used, where we were aiming and where we wound up
  //
  // You can derive this equation by calculating projectile travel distance
  // given some angle and initial velocity, plus an error term added to
  // that initial velocity, separating out the distance terms resulting
  // from the error, equating those to the resulting distance error,
  // and then solving for the velocity error offset
  // (that's really awkward to describe without some LaTeX)
  let sine = Math.sin(2 * e_used);
  let frac = (10 * d_err) / sine;
  let sum = frac + Math.pow(p_used, 2);
  let root = Math.sqrt(sum);
  let p_offset = Math.round(root - p_used);
  globals.power_offset += p_offset; // add rather than set for future calls
  $('#power_offset').text(Number(p_offset.toFixed(2)));
  
  // Bearing error is easy, just get the bearing from "north"/fore-ward
  // for both source->target and source->actual, and subtract
  let bearing_error = tv.bearing() - rv.bearing();
  let error_deg = Math.round(bearing_error * 180 / Math.PI);
  globals.bearing_offset += error_deg;
  let bearing = globals.bearing_offset;// * 180 / Math.PI;
  $('#bearing_offset').text(Number(bearing.toFixed(2)));
}

function resetCalibration() {
	globals.bearing_offset = 0;
  globals.dist_offset = 0;
  globals.dist_mult = 1;
  globals.power_offset = 0;
  $('#power_offset').text(Number(globals.power_offset.toFixed(2)));
  $('#bearing_offset').text(Number(globals.bearing_offset.toFixed(2)));
  calculateLanding();
}

function toggleOverrideVisibility() {
	$('#override_hider').toggle();
}

function setOverrides() {
	resetCalibration();
  
  globals.power_offset = Number($('#power_override').val());
  globals.bearing_offset = Number($('#bearing_override').val());
  $('#power_offset').text((globals.power_offset));
  $('#bearing_offset').text(globals.bearing_offset);
  
  calculateLanding();
}

/* This guy figures out XYZ, given some settings */
function recalculateSettings() {
	// On second thought, this would have very limited utility
}

// Removed, too slow
/*function updateMapImg(z) {
  let url = '';
  switch (Number(z)) {
  	case 3:
    	url = 'https://image.ibb.co/d6ekef/map2-z3-m-dark.png';
    	break;
    case 4:
    	url = 'https://image.ibb.co/e7S5ef/map2-z4-m-dark.png';
    	break;
    case 5:
    	url = 'https://image.ibb.co/ckddzf/map2-z5-m-dark.png';
    	break;
    default: // 1
    	url = 'https://image.ibb.co/daYBKf/map2-z1-m-dark.png';
  }
  $('#mapimg').attr('src', url);
}*/

function drawMap() {
	let c = globals.canvas_context;
  c.fillStyle = 'black';
	c.fillRect(0, 0, 765, 765);
  let id = 'mapimg_z1';
  let z = Number(globals.target_pos.tz);
  switch (z) {
  	case 3:
    	id = 'mapimg_z3'
      break;
  	case 4:
    	id = 'mapimg_z4'
      break;
  	case 5:
    	id = 'mapimg_z5'
      break;
  	case 6:
    	id = 'mapimg_z6'
      break;
  }
  
  let img = document.getElementById(id);
  let sx = (globals.map_bounds.min.x - 1) * 32;
  let sy = (globals.map_bounds.min.y - 1) * 32;
  let swidth = (globals.map_bounds.max.x - globals.map_bounds.min.x + 1) * 32;
  let sheight = (globals.map_bounds.max.y - globals.map_bounds.min.y + 1) * 32;
  let dx = 0;
  let dy = 0;
  let dwidth = 765;
  let dheight = 765;
  c.drawImage(img, sx, sy, swidth, sheight, dx, dy, dwidth, dheight);
}

/* Draws source/target as circles and a line between them on canvas */
function drawSourceTarget() {
  let {tx, ty, tz} = globals.target_pos;
  let {sx, sy, sz} = globals.source_pos;
  if (tx * ty * tz * sx * sy * sz == 0) {
  	// Don't do anything before all fields have meaningful values
    return;
  }
  
  let [su, sv] = stationCoordsToCanvasPos(sx, 256 - sy);
  let [tu, tv] = stationCoordsToCanvasPos(tx, 256 - ty);
  //sv = 765 - sv; tv = 765 - tv;
  
  let c = globals.canvas_context;
  
  c.beginPath();
  
  c.strokeStyle = '#ff2ae5';
  c.lineWidth = 1 * (globals.map_zoom_level + 1) + 1;
    
  c.moveTo(su, sv);
  c.lineTo(tu, tv);
  c.stroke();
  
  c.fillStyle = 'greenyellow';
  
  let t_circle = new Path2D();
  t_circle.arc(tu, tv, 2 * (globals.map_zoom_level + 1) + 2, 0, 2 * Math.PI);
  c.fill(t_circle);
  
  c.fillStyle = 'peru';
  
  let s_circle = new Path2D();
  s_circle.arc(su, sv, 2 * (globals.map_zoom_level + 1) + 2, 0, 2 * Math.PI);
  c.fill(s_circle);
}

/* 
	Get a good ballpark estimate of coords based on clicks on the map 
	(meaning I stiched this together in GIMP from screen grabs
   and then scaled it and stuff, so expect an error of a square or two)
*/
function setPosWithClick(e) {
  let first, second = null;
	if (globals.m_button == 'right') {
  	first = '#source_x';
    second = '#source_y';
  }
  else if (globals.m_button == 'left') {
  	first = '#target_x';
    second = '#target_y';
  }
  else {
  	return;
  }
  //let canvas_pos = { left: e.offsetX, top: e.offsetY};
  //let x = Math.ceil(canvas_pos.left / 3);
  //let y = 256 - Math.floor(canvas_pos.top / 3);
  let station_coord = canvasPosToStationCoords(e.offsetX, e.offsetY);
  $(first).val(station_coord[0]); $(second).val(256 - station_coord[1]);
  $('#target_x').change();
}

function scrollMap(e) {
  let view_range = (128 / Math.pow(2, globals.map_zoom_level)) - 1;
  let tiles_on_canvas = view_range * 2 + 1;
	let dx_pixels = e.offsetX - globals.drag_start.cursor.x;
  let dy_pixels = e.offsetY - globals.drag_start.cursor.y;
  if (dx_pixels === 0 && dy_pixels === 0) {
  	return;
  }
  let dx_tiles = -Math.floor(0.5 + tiles_on_canvas * dx_pixels / 765);
  let dy_tiles = -Math.floor(0.5 + tiles_on_canvas * dy_pixels / 765);
  
  if (!(globals.drag_start.view.min.x >= 1 - dx_tiles && 
      globals.drag_start.view.max.x <= 255 - dx_tiles)) 
  {
  	dx_tiles = 0;
  }
  if (!(globals.drag_start.view.min.y >= 1 - dy_tiles && 
      globals.drag_start.view.max.y <= 255 - dy_tiles))
  {
  	dy_tiles = 0;
  }
  
  globals.map_bounds = {
    min : {
      x : globals.drag_start.view.min.x + dx_tiles,
      y : globals.drag_start.view.min.y + dy_tiles
    },
    max : {
      x : globals.drag_start.view.max.x + dx_tiles,
      y : globals.drag_start.view.max.y + dy_tiles
    }
  };
  console.table(globals.drag_start.view);
}

function zoomMap(e) {
  let zoom_increment = 0;
  if (e.originalEvent.deltaY < 0) {
  	zoom_increment = 1;
  }
  else {
  	zoom_increment = -1;
  }
  
  let new_zoom = Math.min(4, Math.max(globals.map_zoom_level + zoom_increment, 0));
  if (new_zoom === globals.map_zoom_level) {
  	return;
  }
  //globals.map_zoom_level = Math.min(4, Math.max(globals.map_zoom_level + zoom_increment, 0));
  
	let new_center = null;
	if (e !== null) {
  	let hovered_station_tile = canvasPosToStationCoords(e.offsetX, e.offsetY);
    //let frac_w = (e.offsetX / 765);
    //let frac_h = (e.offsetY / 765);
    let view_range = (128 / Math.pow(2, new_zoom)) - 1;
    let tiles_on_canvas = view_range * 2 + 1;
  	let center_tile_offset_x = Math.floor(0.5 + ((e.offsetX / 765) - 0.5) * tiles_on_canvas);
  	let center_tile_offset_y = Math.floor(0.5 + ((e.offsetY / 765) - 0.5) * tiles_on_canvas);
  	new_center = {
    	x: hovered_station_tile[0] - center_tile_offset_x,
      y: hovered_station_tile[1] - center_tile_offset_y
    }
  }
  if (!new_center) {
  	new_center = {
    	x: 128,
      y: 128
    };
  }
  
  globals.map_zoom_level = new_zoom;
  
  let zl = globals.map_zoom_level;
  let zoom_factor = 1 / Math.pow(2, zl); // fraction of full img to display
  if (zoom_factor === 1) {
  	globals.view_range = 127;
    globals.map_bounds = { min : { x : 1, y : 1}, max : { x : 255, y : 255 }};
  }
  else {
    let view_range = (((255 + 1) * zoom_factor) / 2) - 1;
    globals.view_range = view_range;
    globals.map_bounds = {
    	min : {
      	x : new_center.x - view_range,
        y : new_center.y - view_range
      },
      max : {
      	x : new_center.x + view_range,
        y : new_center.y + view_range
      }
    }
  }
}

function canvasPosToStationCoords(x, y) {
	let vw = globals.map_bounds;
  let view_range = (128 / Math.pow(2, globals.map_zoom_level)) - 1;
  let tiles_on_canvas = view_range * 2 + 1;
  let canvas_tile_offset_x = Math.floor((x / 765) * tiles_on_canvas);
  let canvas_tile_offset_y = Math.floor((y / 765) * tiles_on_canvas);
  return [vw.min.x + canvas_tile_offset_x,  vw.min.y + canvas_tile_offset_y];
}

/* can return values outside [0, 0] - [765, 765] since tile can be out of view*/
function stationCoordsToCanvasPos(x, y) {
	let vw = globals.map_bounds;
  let view_range = (128 / Math.pow(2, globals.map_zoom_level)) - 1;
  let tiles_on_canvas = view_range * 2 + 1;
  let dx = Math.floor(((x - vw.min.x) + 0.5) * (765 / tiles_on_canvas));
  let dy = Math.floor(((y - vw.min.y) + 0.5) * (765 / tiles_on_canvas));
  return [dx, dy];
}

function imgPosFromStationCoords(x, y) {
	// Map image res is chosen to be 3 times gameworld dimensions
  // So each tile is 3x3 pixels, we just choose the center one here
  // (accounting for different start index for both as well -- 0 vs 1)
  // (also for imageY starting from top and worldY from bottom)
	return [3 * (x - 1) + 2, 767 - (3 * (y - 1) + 2)];
}

function stationCoordsFromImgPos(u, v) {
	// reverse of the above, just binning basically
  return [Math.ceil(u / 3), 256 - Math.ceil(v / 3)];
}

function clearCanvas() {
	globals.canvas_context.clearRect(0, 0, 765, 765);
}