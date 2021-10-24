var viewing = false;
var open = null;
function script() {
  let imgs = document.querySelectorAll("img:not(#navbar-image)");
  for (let img of imgs) {
    img.addEventListener("click", handleOpenClick);
  }
  let vidyas = document.querySelectorAll("video");
  for (let vid of vidyas) {
    vid.addEventListener("click", handleOpenClick);
  }
}

function handleOpenClick(event) {
  if (!viewing) {
    event.stopPropagation();
    let large = null;
    if (event.target.tagName === "IMG"){
      large = document.createElement("img");
      large.setAttribute("src", event.target.getAttribute("src"));
    }
    else if (event.target.tagName === "VIDEO") {
      large = document.createElement("video");
      large.autoplay = true;
      large.loop = true;
      let src = document.createElement("source");
      let source = event.target.getElementsByTagName("source")[0].getAttribute("src");
      src.setAttribute("src", source);
      large.appendChild(src);
    }
    else {
      return;
    }
    large.classList.add("viewing");
    //large.setAttribute("src", event.target.getAttribute("src"));
    document.body.appendChild(large);
    document.addEventListener("click", handleCloseClick, { once : true});
    open = large;
    viewing = true;
  }
}

function handleCloseClick(event) {
  open.remove();
  open = null;
  viewing = false;
}
window.onload = Promise.resolve().then(script);