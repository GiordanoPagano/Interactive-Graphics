// This function takes the projection matrix, the translation, and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// The given projection matrix is also a 4x4 matrix stored as an array in column-major order.
// You can use the MatrixMult function defined in project4.html to multiply two 4x4 matrices in the same format.
function GetModelViewProjection( projectionMatrix, translationX, translationY, translationZ, rotationX, rotationY )
{
	// [TO-DO] Modify the code below to form the transformation matrix.
	var trans = [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		translationX, translationY, translationZ, 1
	];
	
	// Matrice di Rotazione attorno all'asse X
    var cosX = Math.cos(rotationX);
    var sinX = Math.sin(rotationX);
    var rotationXMatrix = [
        1,    0,     0, 0,
        0, cosX,  sinX, 0,
        0,-sinX,  cosX, 0,
        0,    0,     0, 1
    ];

	// Matrice di Rotazione attorno all'asse Y
    var cosY = Math.cos(rotationY);
    var sinY = Math.sin(rotationY);
    var rotationYMatrix = [
        cosY, 0,-sinY, 0,
           0, 1,    0, 0,
        sinY, 0, cosY, 0,
           0, 0,    0, 1
    ];

	// Combinazione delle Matrici
    var mvp = MatrixMult(projectionMatrix, trans);
    mvp = MatrixMult(mvp, rotationYMatrix);
    mvp = MatrixMult(mvp, rotationXMatrix);
	return mvp;
}


// [TO-DO] Complete the implementation of the following class.

class MeshDrawer
{
	// The constructor is a good place for taking care of the necessary initializations.
	constructor()
	{
		// [TO-DO] initializations

		// Create vertex buffers
        this.vertexBuffer = gl.createBuffer();
        this.texCoordBuffer = gl.createBuffer();
        this.numTriangles = 0;

		// Create and compile shaders
        const vertexShaderSource = `
            attribute vec3 aVertexPosition;
            attribute vec2 aTextureCoord;
            uniform mat4 uMVPMatrix;
            uniform bool uSwapYZ;
            varying vec2 vTextureCoord;
            
            void main() {
                vec3 pos = aVertexPosition;
                if (uSwapYZ) {
                    pos = vec3(pos.x, pos.z, pos.y);
                }
                gl_Position = uMVPMatrix * vec4(pos, 1.0);
                vTextureCoord = aTextureCoord;
            }
        `;

		const fragmentShaderSource = `
			precision mediump float;
			varying vec2 vTextureCoord;
			uniform sampler2D uSampler;
			uniform bool uShowTexture;
		
			void main() {
				if (uShowTexture) {
					gl_FragColor = texture2D(uSampler, vTextureCoord);
				} else {
					gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
				}
			}
		`;

		// Compile shaders
		const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);
		const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
		
		// Create shader program
        this.shaderProgram = gl.createProgram();
        gl.attachShader(this.shaderProgram, vertexShader);
        gl.attachShader(this.shaderProgram, fragmentShader);
        gl.linkProgram(this.shaderProgram);
        
        if (!gl.getProgramParameter(this.shaderProgram, gl.LINK_STATUS)) {
            console.error('Shader program link error:', gl.getProgramInfoLog(this.shaderProgram));

		}

		// Get attribute and uniform locations
        this.vertexPositionAttribute = gl.getAttribLocation(this.shaderProgram, "aVertexPosition");
        this.textureCoordAttribute = gl.getAttribLocation(this.shaderProgram, "aTextureCoord");
        this.mvpMatrixUniform = gl.getUniformLocation(this.shaderProgram, "uMVPMatrix");
        this.swapYZUniform = gl.getUniformLocation(this.shaderProgram, "uSwapYZ");
        this.samplerUniform = gl.getUniformLocation(this.shaderProgram, "uSampler");
        this.showTextureUniform = gl.getUniformLocation(this.shaderProgram, "uShowTexture");

		// Create and configure texture
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }

	compileShader(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
	
	// This method is called every time the user opens an OBJ file.
	// The arguments of this function is an array of 3D vertex positions
	// and an array of 2D texture coordinates.
	// Every item in these arrays is a floating point value, representing one
	// coordinate of the vertex position or texture coordinate.
	// Every three consecutive elements in the vertPos array forms one vertex
	// position and every three consecutive vertex positions form a triangle.
	// Similarly, every two consecutive elements in the texCoords array
	// form the texture coordinate of a vertex.
	// Note that this method can be called multiple times.
	setMesh( vertPos, texCoords )
	{
		// [TO-DO] Update the contents of the vertex buffer objects.
		this.numTriangles = vertPos.length / 3;
		
        // Bind and fill vertex position buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);
        
        // Bind and fill texture coordinate buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
	}
	
	// This method is called when the user changes the state of the
	// "Swap Y-Z Axes" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	swapYZ( swap )
	{
		// [TO-DO] Set the uniform parameter(s) of the vertex shader
		gl.useProgram(this.shaderProgram);
        gl.uniform1i(this.swapYZUniform, swap ? 1 : 0);
	}
	
	// This method is called to draw the triangular mesh.
	// The argument is the transformation matrix, the same matrix returned
	// by the GetModelViewProjection function above.
	draw( trans )
	{
		// [TO-DO] Complete the WebGL initializations before drawing
		gl.useProgram(this.shaderProgram);
        
        // Set the model-view-projection matrix
        gl.uniformMatrix4fv(this.mvpMatrixUniform, false, trans);
        
        // Set up vertex position attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(this.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.vertexPositionAttribute);
        
        // Set up texture coordinate attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.vertexAttribPointer(this.textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.textureCoordAttribute);
        
        // Draw the triangles
        gl.drawArrays(gl.TRIANGLES, 0, this.numTriangles);
	}
	
	// This method is called to set the texture of the mesh.
	// The argument is an HTML IMG element containing the texture data.
	setTexture( img )
	{
		// [TO-DO] Bind the texture
		gl.bindTexture(gl.TEXTURE_2D, this.texture);

		// You can set the texture image data using the following command.
		gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img );

		// [TO-DO] Now that we have a texture, it might be a good idea to set
		
		// some uniform parameter(s) of the fragment shader, so that it uses the texture.
		// Enable texture by default when it's set
        gl.useProgram(this.shaderProgram);
        gl.uniform1i(this.showTextureUniform, 1);
        gl.uniform1i(this.samplerUniform, 0); // Use texture unit 0
	}
	
	// This method is called when the user changes the state of the
	// "Show Texture" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	showTexture( show )
	{
		// [TO-DO] set the uniform parameter(s) of the fragment shader to specify if it should use the texture.
		gl.useProgram(this.shaderProgram);
        gl.uniform1i(this.showTextureUniform, show ? 1 : 0);
	}
	
}
