// Returns a 3x3 transformation matrix as an array of 9 values in column-major order.
// The transformation first applies scale, then rotation, and finally translation.
// The given rotation value is in degrees.

function GetTransform(positionX, positionY, rotation, scale) {
    // Convertire l'angolo di rotazione da gradi a radianti
    let rad = rotation * Math.PI / 180;
    // Calcolare i valori di coseno e seno
    let cos = Math.cos(rad);
    let sin = Math.sin(rad);
    // Costruire la matrice in ordine colonna-principale
    return [
        scale * cos, scale * sin, 0,
        -scale * sin, scale * cos, 0,
        positionX, positionY, 1
    ];
}

// Returns a 3x3 transformation matrix as an array of 9 values in column-major order.
// The arguments are transformation matrices in the same format.
// The returned transformation first applies trans1 and then trans2.
function ApplyTransform(trans1, trans2) {
    let result = new Array(9);
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            result[row * 3 + col] = 0;
            for (let k = 0; k < 3; k++) {
                result[row * 3 + col] += trans1[k + row * 3] * trans2[col + k * 3 ];
            }
        }
    }
    return result;
}
