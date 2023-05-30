
export function scaleCanvas(widestElement, maxCanvasWidth, maxCanvasHeight) {
    console.log("resized");
    var containerWidth = document.getElementById(widestElement).offsetWidth;

    var scaleFactor = Math.min(1, containerWidth / (maxCanvasWidth * 1));

    document.querySelector("canvas").style.width = (maxCanvasWidth * scaleFactor) + "px";
    return {width: (maxCanvasWidth * scaleFactor) + "px", height: (maxCanvasHeight * scaleFactor) + "px"};

}


// Update the canvas position when the window is resized
// window.addEventListener('resize', function () {
//     scaleCanvas();
// });