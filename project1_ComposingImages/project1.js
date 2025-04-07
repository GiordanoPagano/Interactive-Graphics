// bgImg is the background image to be modified.
// fgImg is the foreground image.
// fgOpac is the opacity of the foreground image.
// fgPos is the position of the foreground image in pixels. It can be negative and (0,0) means the top-left pixels of the foreground and background are aligned.
function composite(bgImg, fgImg, fgOpac, fgPos) {
    let bgData = bgImg.data;
    let fgData = fgImg.data;
    let bgWidth = bgImg.width;
    let bgHeight = bgImg.height;
    let fgWidth = fgImg.width;
    let fgHeight = fgImg.height;

    for (let y = 0; y < fgHeight; y++) {
        for (let x = 0; x < fgWidth; x++) {
            let bgX = x + fgPos.x;
            let bgY = y + fgPos.y;

            // Controllo se il pixel di background è valido
            if (bgX < 0 || bgX >= bgWidth || bgY < 0 || bgY >= bgHeight) {
                continue;
            }

            let fgIndex = (y * fgWidth + x) * 4;
            let bgIndex = (bgY * bgWidth + bgX) * 4;

            let fgR = fgData[fgIndex];
            let fgG = fgData[fgIndex + 1];
            let fgB = fgData[fgIndex + 2];
            let fgA = fgData[fgIndex + 3] / 255 * fgOpac; // Normalizzazione e applicazione dell'opacità

            let bgR = bgData[bgIndex];
            let bgG = bgData[bgIndex + 1];
            let bgB = bgData[bgIndex + 2];
            let bgA = bgData[bgIndex + 3] / 255;

            // Alpha compositing formula: C_out = C_fg * A_fg + C_bg * A_bg * (1 - A_fg)
            let outA = fgA + bgA * (1 - fgA);
            if (outA > 0) {
                bgData[bgIndex]     = (fgR * fgA + bgR * bgA * (1 - fgA)) / outA;
                bgData[bgIndex + 1] = (fgG * fgA + bgG * bgA * (1 - fgA)) / outA;
                bgData[bgIndex + 2] = (fgB * fgA + bgB * bgA * (1 - fgA)) / outA;
                bgData[bgIndex + 3] = outA * 255; // Convertiamo in 0-255
            }
        }
    }
}
