// This function takes the translation and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// You can use the MatrixMult function defined in project5.html to multiply two 4x4 matrices in the same format.
function GetModelViewMatrix( translationX, translationY, translationZ, rotationX, rotationY )
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
var mv = MatrixMult(trans, rotationYMatrix);
mv = MatrixMult(mv, rotationXMatrix);
return mv;

}


// [TO-DO] Complete the implementation of the following class.

class MeshDrawer
{
	// The constructor is a good place for taking care of the necessary initializations.
	constructor()
	{
		// Create vertex buffers
        this.vertexBuffer = gl.createBuffer();
        this.texCoordBuffer = gl.createBuffer();
        this.normalBuffer = gl.createBuffer();
        this.numTriangles = 0;

		 // Create and compile shaders
		 const vertexShaderSource = `
		 attribute vec3 aVertexPosition;
		 attribute vec2 aTextureCoord;
		 attribute vec3 aVertexNormal;
		 
		 uniform mat4 uMVPMatrix;
		 uniform mat4 uMVMatrix;
		 uniform mat3 uNormalMatrix;
		 uniform bool uSwapYZ;
		 
		 varying vec3 vNormal;
		 varying vec3 vPosition;
		 varying vec2 vTextureCoord;
		 
		 void main() {
			 vec3 pos = aVertexPosition;
			 if (uSwapYZ) {
				 pos = vec3(pos.x, pos.z, pos.y);
			 }
			 
			 gl_Position = uMVPMatrix * vec4(pos, 1.0);
			 vPosition = (uMVMatrix * vec4(pos, 1.0)).xyz;
			 vNormal = uNormalMatrix * (uSwapYZ ? vec3(aVertexNormal.x, aVertexNormal.z, aVertexNormal.y) : aVertexNormal);
			 vTextureCoord = aTextureCoord;
		 }
	 `;
	 
	 const fragmentShaderSource = `
		 precision highp float;
		 
		 varying vec3 vNormal;
		 varying vec3 vPosition;
		 varying vec2 vTextureCoord;
		 
		 uniform vec3 uLightDir;
		 uniform float uShininess;
		 uniform sampler2D uSampler;
		 uniform bool uShowTexture;
		 
		 void main() {
			 // Normalize the normal and light direction
			 vec3 N = normalize(vNormal);
			 vec3 L = normalize(-uLightDir);
			 
			 // Calculate diffuse component
			 float diffuse = max(dot(N, L), 0.0);
			 
			 // Calculate specular component (Blinn-Phong)
			 vec3 V = normalize(-vPosition); // Camera is at (0,0,0) in view space
			 vec3 H = normalize(L + V);
			 float specular = pow(max(dot(N, H), 0.0), uShininess);
			 
			 // Material properties
			 vec3 Kd = uShowTexture ? texture2D(uSampler, vTextureCoord).rgb : vec3(1.0);
			 vec3 Ks = vec3(1.0); // White specular
			 vec3 Ka = vec3(0.1); // Small ambient
			 
			 // Combine components
			 vec3 ambient = Ka;
			 vec3 diffuseColor = Kd * diffuse;
			 vec3 specularColor = Ks * specular;
			 
			 gl_FragColor = vec4(ambient + diffuseColor + specularColor, 1.0);
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
	this.normalAttribute = gl.getAttribLocation(this.shaderProgram, "aVertexNormal");
	
	this.mvpMatrixUniform = gl.getUniformLocation(this.shaderProgram, "uMVPMatrix");
	this.mvMatrixUniform = gl.getUniformLocation(this.shaderProgram, "uMVMatrix");
	this.normalMatrixUniform = gl.getUniformLocation(this.shaderProgram, "uNormalMatrix");
	this.swapYZUniform = gl.getUniformLocation(this.shaderProgram, "uSwapYZ");
	this.lightDirUniform = gl.getUniformLocation(this.shaderProgram, "uLightDir");
	this.shininessUniform = gl.getUniformLocation(this.shaderProgram, "uShininess");
	this.samplerUniform = gl.getUniformLocation(this.shaderProgram, "uSampler");
	this.showTextureUniform = gl.getUniformLocation(this.shaderProgram, "uShowTexture");
	
	// Create and configure texture
	this.texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, this.texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	
	// Default light direction (can be changed via setLightDir)
	this.lightDir = [1, 1, 1];
	this.shininess = 32.0;
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
	// The arguments of this function is an array of 3D vertex positions,
	// an array of 2D texture coordinates, and an array of vertex normals.
	// Every item in these arrays is a floating point value, representing one
	// coordinate of the vertex position or texture coordinate.
	// Every three consecutive elements in the vertPos array forms one vertex
	// position and every three consecutive vertex positions form a triangle.
	// Similarly, every two consecutive elements in the texCoords array
	// form the texture coordinate of a vertex and every three consecutive 
	// elements in the normals array form a vertex normal.
	// Note that this method can be called multiple times.
	setMesh( vertPos, texCoords, normals )
	{
		// [TO-DO] Update the contents of the vertex buffer objects.
		this.numTriangles = vertPos.length / 3;
        
        // Bind and fill vertex position buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);
        
		// Bind and fill texture coordinate buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
        
		// Bind and fill normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
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
	// The arguments are the model-view-projection transformation matrixMVP,
	// the model-view transformation matrixMV, the same matrix returned
	// by the GetModelViewProjection function above, and the normal
	// transformation matrix, which is the inverse-transpose of matrixMV.
	draw( matrixMVP, matrixMV, matrixNormal )
	{
		// [TO-DO] Complete the WebGL initializations before drawing
		gl.useProgram(this.shaderProgram);
        
        // Set the matrices
        gl.uniformMatrix4fv(this.mvpMatrixUniform, false, matrixMVP);
        gl.uniformMatrix4fv(this.mvMatrixUniform, false, matrixMV);
        gl.uniformMatrix3fv(this.normalMatrixUniform, false, matrixNormal);
        
		// Set light direction and shininess
        gl.uniform3fv(this.lightDirUniform, this.lightDir);
        gl.uniform1f(this.shininessUniform, this.shininess);

        // Set up vertex position attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(this.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.vertexPositionAttribute);
        
		// Set up texture coordinate attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.vertexAttribPointer(this.textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.textureCoordAttribute);
        
		// Set up normal attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.vertexAttribPointer(this.normalAttribute, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.normalAttribute);
        
		// Draw the triangles
		gl.drawArrays( gl.TRIANGLES, 0, this.numTriangles );
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
	
	// This method is called to set the incoming light direction
	setLightDir( x, y, z )
	{
		// [TO-DO] set the uniform parameter(s) of the fragment shader to specify the light direction.
		this.lightDir = [-x, -y, -z];
	}
	
	// This method is called to set the shininess of the material
	setShininess( shininess )
	{
		// [TO-DO] set the uniform parameter(s) of the fragment shader to specify the shininess.
		this.shininess = shininess;
	}
}


// This function is called for every step of the simulation.
// Its job is to advance the simulation for the given time step duration dt.
// It updates the given positions and velocities.
function SimTimeStep( dt, positions, velocities, springs, stiffness, damping, particleMass, gravity, restitution )
{
	var forces = Array( positions.length ); // The total for per particle
	
	// [TO-DO] Compute the total force of each particle
	for (let i = 0; i < positions.length; i++) {
	    forces[i] = new Vec3(0, 0, 0);
	}
	for (let spring of springs) {
		let i = spring.p0;
		let j = spring.p1;
		let restLength = spring.rest;
	
		let p0 = positions[i];
		let p1 = positions[j];
		let v0 = velocities[i];
		let v1 = velocities[j];
	
		let deltaP = p1.sub(p0);
		let currentLength = deltaP.len();
		let direction = deltaP.unit();
	
		// Hooke's Law
		let springForce = direction.mul(stiffness * (currentLength - restLength));
	
		// Damping force
		let deltaV = v1.sub(v0);
		let dampingForce = direction.mul(damping * deltaV.dot(direction));
	
		// Total force
		let totalForce = springForce.add(dampingForce);
	
		forces[i].inc(totalForce);
		forces[j].dec(totalForce);
	}
	for (let i = 0; i < positions.length; i++) {
		forces[i].inc(gravity.mul(particleMass));
	}

	// [TO-DO] Update positions and velocities
	for (let i = 0; i < positions.length; i++) {
		// Acceleration
		let acceleration = forces[i].div(particleMass);
	
		// Update velocity
		velocities[i].inc(acceleration.mul(dt));
	
		// Update position
		positions[i].inc(velocities[i].mul(dt));
	}
	
	// [TO-DO] Handle collisions
	for (let i = 0; i < positions.length; i++) {
		for (let axis of ['x', 'y', 'z']) {
			if (positions[i][axis] < -1) {
				positions[i][axis] = -1;
				if (velocities[i][axis] < 0) {
					velocities[i][axis] *= -restitution;
				}
			} else if (positions[i][axis] > 1) {
				positions[i][axis] = 1;
				if (velocities[i][axis] > 0) {
					velocities[i][axis] *= -restitution;
				}
			}
		}
	}
	
}

