// Rymentz 2025
// Kaspa Voxel Miner - 3D Minesweeper with Three.js
// Configuration and global variables
let scene, camera, renderer, controls;
let gameGrid = [];
let gameState = {
    isPlaying: false,
    isGameOver: false,
    startTime: null,
    currentTime: 0,
    kasCollected: 0,
    totalKasBlocks: 0,
    revealedBlocks: 0,
    totalSafeBlocks: 0
};

// Difficulty configurations
const difficulties = {
    easy: { size: 5, traps: 8, kasBlocks: 12 },
    medium: { size: 6, traps: 15, kasBlocks: 20 },
    hard: { size: 7, traps: 25, kasBlocks: 30 }
};

// Block types
const BLOCK_TYPES = {
    EMPTY: 0,
    KASPA: 1,
    TRAP: 2
};

// Colors and materials (using Kaspa colors)
const COLORS = {
    hidden: 0x8B4513,
    empty: 0xD2B48C,
    kaspa: 0x71C7BA,
    trap: 0xff0000,
    number: 0xFFFFFF,
    outline: 0x000000,
    border: 0x4A4A4A
};

// Variables for interaction
let raycaster, hoveredBlock = null;
let kaspaTexture = null;

// Game initialization
function init() {
    setupThreeJS();
    setupControls();
    setupEventListeners();
    loadBestTime();
    startNewGame();
}

// Three.js setup with improved lighting
function setupThreeJS() {
    const gameContainer = document.getElementById('game-container');
    
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f1419);
    
    // Camera
    const aspect = gameContainer.clientWidth / gameContainer.clientHeight;
    camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(gameContainer.clientWidth, gameContainer.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    gameContainer.appendChild(renderer.domElement);
    
    // Optimal lighting setup - eliminating shadows for uniform visibility
    // High ambient light ensures all faces are equally lit regardless of angle
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9); 
    scene.add(ambientLight);
    
    // Six directional lights pointing from each main direction (like a cube)
    // This ensures no face is ever in shadow regardless of camera orientation
    const lightIntensity = 0.3;
    const lightDistance = 20;
    
    // Front light
    const frontLight = new THREE.DirectionalLight(0xffffff, lightIntensity);
    frontLight.position.set(0, 0, lightDistance);
    frontLight.castShadow = false; // Disable shadows to prevent dark faces
    scene.add(frontLight);
    
    // Back light
    const backLight = new THREE.DirectionalLight(0xffffff, lightIntensity);
    backLight.position.set(0, 0, -lightDistance);
    backLight.castShadow = false;
    scene.add(backLight);
    
    // Top light
    const topLight = new THREE.DirectionalLight(0xffffff, lightIntensity);
    topLight.position.set(0, lightDistance, 0);
    topLight.castShadow = false;
    scene.add(topLight);
    
    // Bottom light
    const bottomLight = new THREE.DirectionalLight(0xffffff, lightIntensity);
    bottomLight.position.set(0, -lightDistance, 0);
    bottomLight.castShadow = false;
    scene.add(bottomLight);
    
    // Right light
    const rightLight = new THREE.DirectionalLight(0xffffff, lightIntensity);
    rightLight.position.set(lightDistance, 0, 0);
    rightLight.castShadow = false;
    scene.add(rightLight);
    
    // Left light
    const leftLight = new THREE.DirectionalLight(0xffffff, lightIntensity);
    leftLight.position.set(-lightDistance, 0, 0);
    leftLight.castShadow = false;
    scene.add(leftLight);
    
    // Loading Kaspa texture (webp format)
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('./kas_logo.webp', 
        function(texture) {
            kaspaTexture = texture;
            console.log('Kaspa texture loaded successfully');
        },
        function(progress) {
            console.log('Loading texture:', (progress.loaded / progress.total * 100) + '%');
        },
        function(error) {
            console.warn('Error loading Kaspa texture:', error);
        }
    );
    
    // Raycaster for interaction
    raycaster = new THREE.Raycaster();
}

// Camera controls setup
function setupControls() {
    // Simple camera controls (rotation with mouse)
    let isDragging = false;
    let hasDragged = false;
    let previousMousePosition = { x: 0, y: 0 };
    let dragStartPosition = { x: 0, y: 0 };
    let cameraDistance = 15;
    let cameraAngleX = 0;
    let cameraAngleY = 0;
    const dragThreshold = 15; // Increased threshold for better drag detection
    let mouseDownTime = 0;
    const clickTimeThreshold = 300; // Maximum time for a click (ms)
    
    // Initial camera position
    updateCameraPosition();
    camera.lookAt(0, 0, 0);
    
    function updateCameraPosition() {
        const x = cameraDistance * Math.sin(cameraAngleY) * Math.cos(cameraAngleX);
        const y = cameraDistance * Math.sin(cameraAngleX);
        const z = cameraDistance * Math.cos(cameraAngleY) * Math.cos(cameraAngleX);
        camera.position.set(x, y, z);
        camera.lookAt(0, 0, 0);
    }
    
    renderer.domElement.addEventListener('mousedown', function(e) {
        if (e.button === 0) { // Left click
            isDragging = true;
            hasDragged = false;
            mouseDownTime = Date.now();
            previousMousePosition = { x: e.clientX, y: e.clientY };
            dragStartPosition = { x: e.clientX, y: e.clientY };
        }
    });
    
    renderer.domElement.addEventListener('mousemove', function(e) {
        if (isDragging) {
            const totalDragDistance = Math.sqrt(
                Math.pow(e.clientX - dragStartPosition.x, 2) + 
                Math.pow(e.clientY - dragStartPosition.y, 2)
            );
            
            // If moved more than threshold pixels from start, it's a drag
            if (totalDragDistance > dragThreshold) {
                if (!hasDragged) {
                    hasDragged = true;
                    // Prevent any click events from firing
                    e.preventDefault();
                    e.stopPropagation();
                }
                
                const deltaMove = {
                    x: e.clientX - previousMousePosition.x,
                    y: e.clientY - previousMousePosition.y
                };
                
                cameraAngleY += deltaMove.x * 0.01;
                cameraAngleX += deltaMove.y * 0.01;
                
                // Limit vertical angle
                cameraAngleX = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, cameraAngleX));
                
                updateCameraPosition();
                previousMousePosition = { x: e.clientX, y: e.clientY };
            }
        }
    });
    
    renderer.domElement.addEventListener('mouseup', function(e) {
        if (e.button === 0) {
            const clickDuration = Date.now() - mouseDownTime;
            
            // Only treat as click if:
            // 1. No dragging occurred
            // 2. Mouse was held down for less than clickTimeThreshold
            // 3. We're still in the same approximate position
            if (isDragging && !hasDragged && clickDuration < clickTimeThreshold) {
                // Small delay to ensure this is really a click and not start of drag
                setTimeout(() => {
                    if (!hasDragged) {
                        handleBlockClick(e);
                    }
                }, 10);
            }
            
            isDragging = false;
            hasDragged = false;
        }
    });
    
    // Remove the click event listener to avoid double handling
    // The mouseup handler now manages clicks properly
    
    // Zoom with scroll wheel
    renderer.domElement.addEventListener('wheel', function(e) {
        e.preventDefault();
        cameraDistance += e.deltaY * 0.01;
        cameraDistance = Math.max(8, Math.min(25, cameraDistance));
        updateCameraPosition();
    });
}

// Block click handling (separated from click event)
function handleBlockClick(event) {
    if (!gameState.isPlaying || gameState.isGameOver) return;
    
    event.preventDefault();
    
    // Calculate mouse coordinates at click moment
    const rect = renderer.domElement.getBoundingClientRect();
    const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Raycast to detect clicked block
    const mouseVector = new THREE.Vector2(mouseX, mouseY);
    raycaster.setFromCamera(mouseVector, camera);
    
    // Filter objects to only take game blocks (including numbered blocks)
    const gameBlocks = [];
    scene.traverse((child) => {
        if (child.userData && child.userData.isGameBlock && !child.userData.isIndicator) {
            gameBlocks.push(child);
        }
    });
    
    const intersects = raycaster.intersectObjects(gameBlocks);
    
    if (intersects.length > 0) {
        const clickedBlock = intersects[0].object;
        const x = clickedBlock.userData.gridX;
        const y = clickedBlock.userData.gridY;
        const z = clickedBlock.userData.gridZ;
        
        if (x !== undefined && y !== undefined && z !== undefined) {
            revealBlock(x, y, z);
        }
    }
}

// Event listeners setup
function setupEventListeners() {
    document.getElementById('new-game-btn').addEventListener('click', startNewGame);
    document.getElementById('modal-new-game').addEventListener('click', () => {
        hideModal();
        startNewGame();
    });
    
    // Window resize
    window.addEventListener('resize', onWindowResize);
}

// Start new game
function startNewGame() {
    // Reset game state
    gameState = {
        isPlaying: true,
        isGameOver: false,
        startTime: Date.now(),
        currentTime: 0,
        kasCollected: 0,
        totalKasBlocks: 0,
        revealedBlocks: 0,
        totalSafeBlocks: 0
    };
    
    // Clear scene
    clearScene();
    
    // Generate new grid
    generateGrid();
    
    // Update interface
    updateUI();
    updateStatus('New game started! Click on a block to begin.');
    
    // Start timer
    startTimer();
}

// Scene cleanup
function clearScene() {
    const objectsToRemove = [];
    scene.traverse((child) => {
        if (child.userData && child.userData.isGameBlock) {
            objectsToRemove.push(child);
        }
    });
    
    objectsToRemove.forEach((obj) => {
        scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(mat => mat.dispose());
            } else {
                obj.material.dispose();
            }
        }
    });
    
    gameGrid = [];
}

// Game grid generation
function generateGrid() {
    const difficulty = difficulties[document.getElementById('difficulty').value];
    const size = difficulty.size;
    const trapCount = difficulty.traps;
    const kaspaCount = difficulty.kasBlocks;
    
    // Initialize grid
    gameGrid = [];
    for (let x = 0; x < size; x++) {
        gameGrid[x] = [];
        for (let y = 0; y < size; y++) {
            gameGrid[x][y] = [];
            for (let z = 0; z < size; z++) {
                gameGrid[x][y][z] = {
                    type: BLOCK_TYPES.EMPTY,
                    revealed: false,
                    neighborTraps: 0,
                    mesh: null,
                    textMesh: null
                };
            }
        }
    }
    
    // Random placement of traps and kaspa blocks
    const positions = [];
    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
            for (let z = 0; z < size; z++) {
                positions.push({ x, y, z });
            }
        }
    }
    
    // Shuffle positions
    for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    
    // Place traps
    for (let i = 0; i < trapCount; i++) {
        const pos = positions[i];
        gameGrid[pos.x][pos.y][pos.z].type = BLOCK_TYPES.TRAP;
    }
    
    // Place Kaspa blocks
    for (let i = trapCount; i < trapCount + kaspaCount; i++) {
        const pos = positions[i];
        gameGrid[pos.x][pos.y][pos.z].type = BLOCK_TYPES.KASPA;
    }
    
    // Calculate adjacent trap numbers
    calculateNeighborTraps();
    
    // Create visual meshes
    createBlockMeshes();
    
    // Update statistics
    gameState.totalKasBlocks = kaspaCount;
    gameState.totalSafeBlocks = size * size * size - trapCount;
}

// Calculate number of adjacent traps for each block
function calculateNeighborTraps() {
    const size = gameGrid.length;
    
    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
            for (let z = 0; z < size; z++) {
                if (gameGrid[x][y][z].type !== BLOCK_TYPES.TRAP) {
                    let trapCount = 0;
                    
                    // Check all 26 possible neighbors in 3D
                    for (let dx = -1; dx <= 1; dx++) {
                        for (let dy = -1; dy <= 1; dy++) {
                            for (let dz = -1; dz <= 1; dz++) {
                                if (dx === 0 && dy === 0 && dz === 0) continue;
                                
                                const nx = x + dx;
                                const ny = y + dy;
                                const nz = z + dz;
                                
                                if (nx >= 0 && nx < size && ny >= 0 && ny < size && nz >= 0 && nz < size) {
                                    if (gameGrid[nx][ny][nz].type === BLOCK_TYPES.TRAP) {
                                        trapCount++;
                                    }
                                }
                            }
                        }
                    }
                    
                    gameGrid[x][y][z].neighborTraps = trapCount;
                }
            }
        }
    }
}

// Create earth texture for blocks
function createEarthTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    
    // Base earth color
    context.fillStyle = '#8B4513';
    context.fillRect(0, 0, 256, 256);
    
    // Add some dirt texture variation
    for (let i = 0; i < 100; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const size = Math.random() * 8 + 2;
        
        // Darker spots
        context.fillStyle = `rgba(${101 + Math.random() * 20}, ${51 + Math.random() * 20}, ${19 + Math.random() * 10}, 0.7)`;
        context.beginPath();
        context.arc(x, y, size, 0, Math.PI * 2);
        context.fill();
    }
    
    // Add lighter spots
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const size = Math.random() * 6 + 1;
        
        context.fillStyle = `rgba(${160 + Math.random() * 30}, ${120 + Math.random() * 30}, ${60 + Math.random() * 20}, 0.5)`;
        context.beginPath();
        context.arc(x, y, size, 0, Math.PI * 2);
        context.fill();
    }
    
    // Add border for cube delimitation
    context.strokeStyle = '#000000';
    context.lineWidth = 8;
    context.strokeRect(4, 4, 248, 248);
    
    return new THREE.CanvasTexture(canvas);
}

// Create revealed earth texture for empty blocks
function createRevealedEarthTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    
    // Lighter earth color for revealed blocks
    context.fillStyle = '#D2B48C';
    context.fillRect(0, 0, 256, 256);
    
    // Add texture variation
    for (let i = 0; i < 80; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const size = Math.random() * 6 + 2;
        
        context.fillStyle = `rgba(${180 + Math.random() * 30}, ${164 + Math.random() * 30}, ${120 + Math.random() * 20}, 0.6)`;
        context.beginPath();
        context.arc(x, y, size, 0, Math.PI * 2);
        context.fill();
    }
    
    // Add border
    context.strokeStyle = '#000000';
    context.lineWidth = 6;
    context.strokeRect(3, 3, 250, 250);
    
    return new THREE.CanvasTexture(canvas);
}

// Create texture with number for block faces
function createNumberTexture(number) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    
    // Earth background for numbered blocks
    context.fillStyle = '#D2B48C';
    context.fillRect(0, 0, 256, 256);
    
    // Add subtle earth texture
    for (let i = 0; i < 30; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const size = Math.random() * 4 + 1;
        
        context.fillStyle = `rgba(${180 + Math.random() * 20}, ${164 + Math.random() * 20}, ${120 + Math.random() * 15}, 0.4)`;
        context.beginPath();
        context.arc(x, y, size, 0, Math.PI * 2);
        context.fill();
    }
    
    // Border
    context.strokeStyle = '#000000';
    context.lineWidth = 6;
    context.strokeRect(3, 3, 250, 250);
    
    // Number with better contrast
    context.fillStyle = '#000000';
    context.font = 'bold 120px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(number.toString(), 128, 128);
    
    // Add white outline to number for better visibility
    context.strokeStyle = '#FFFFFF';
    context.lineWidth = 4;
    context.strokeText(number.toString(), 128, 128);
    
    // Fill number again in black
    context.fillStyle = '#000000';
    context.fillText(number.toString(), 128, 128);
    
    return new THREE.CanvasTexture(canvas);
}

// Create visual meshes for blocks
function createBlockMeshes() {
    const size = gameGrid.length;
    const blockSize = 0.9;
    const spacing = 1;
    const offset = (size - 1) * spacing / 2;
    
    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
            for (let z = 0; z < size; z++) {
                const block = gameGrid[x][y][z];
                
                // Block geometry
                const geometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
                
                // Use earth texture for hidden blocks
                const earthTexture = createEarthTexture();
                const material = new THREE.MeshLambertMaterial({ 
                    map: earthTexture,
                    color: 0xffffff // White tint to preserve texture colors
                });
                
                const mesh = new THREE.Mesh(geometry, material);
                mesh.position.set(
                    x * spacing - offset,
                    y * spacing - offset,
                    z * spacing - offset
                );
                
                // User data for interaction
                mesh.userData = {
                    isGameBlock: true,
                    gridX: x,
                    gridY: y,
                    gridZ: z
                };
                
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                
                scene.add(mesh);
                block.mesh = mesh;
            }
        }
    }
}

// Block revelation with destruction animation
function revealBlock(x, y, z) {
    const block = gameGrid[x][y][z];
    
    if (block.revealed) return;
    
    block.revealed = true;
    gameState.revealedBlocks++;
    
    // Process according to block type
    if (block.type === BLOCK_TYPES.TRAP) {
        // Game lost
        revealTrap(x, y, z);
        gameOver(false);
    } else if (block.type === BLOCK_TYPES.KASPA) {
        // Kaspa block found
        revealKaspa(x, y, z);
        gameState.kasCollected++;
        checkVictory();
    } else {
        // Empty block
        revealEmpty(x, y, z);
        
        // If no adjacent traps, propagate revelation
        if (block.neighborTraps === 0) {
            propagateReveal(x, y, z);
        }
        
        checkVictory();
    }
    
    updateUI();
}

// Reveal trap
function revealTrap(x, y, z) {
    const block = gameGrid[x][y][z];
    block.mesh.material.color.setHex(COLORS.trap);
    
    // Explosion animation
    const originalScale = block.mesh.scale.clone();
    block.mesh.scale.multiplyScalar(1.2);
    
    setTimeout(() => {
        if (block.mesh.scale) {
            block.mesh.scale.copy(originalScale);
        }
    }, 200);
}

// Reveal Kaspa block with texture and destruction animation
function revealKaspa(x, y, z) {
    const block = gameGrid[x][y][z];
    
    // Create materials array for Kaspa block faces
    let materials;
    if (kaspaTexture) {
        // Use Kaspa texture on all faces
        const kaspaTexturedMaterial = new THREE.MeshLambertMaterial({ 
            map: kaspaTexture,
            color: 0xffffff 
        });
        materials = [
            kaspaTexturedMaterial, kaspaTexturedMaterial, kaspaTexturedMaterial,
            kaspaTexturedMaterial, kaspaTexturedMaterial, kaspaTexturedMaterial
        ];
    } else {
        // Fallback to solid color
        const kaspaMaterial = new THREE.MeshLambertMaterial({ color: COLORS.kaspa });
        materials = [kaspaMaterial, kaspaMaterial, kaspaMaterial, kaspaMaterial, kaspaMaterial, kaspaMaterial];
    }
    
    block.mesh.material = materials;
    
    // Destruction animation - block shrinks and becomes transparent
    animateBlockDestruction(block, () => {
        // After destruction, create a small Kaspa coin indicator
        createKaspaIndicator(x, y, z);
    });
}

// Reveal empty block - show number on cube faces or destroy if empty
function revealEmpty(x, y, z) {
    const block = gameGrid[x][y][z];
    
    if (block.neighborTraps > 0) {
        // Create cube with number on all faces
        const numberTexture = createNumberTexture(block.neighborTraps);
        const numberMaterial = new THREE.MeshLambertMaterial({ map: numberTexture });
        const materials = [
            numberMaterial, numberMaterial, numberMaterial,
            numberMaterial, numberMaterial, numberMaterial
        ];
        block.mesh.material = materials;
    } else {
        // Empty block with no adjacent traps - destroy it like Kaspa blocks
        animateBlockDestruction(block, () => {
            // No indicator needed for empty blocks, just destruction
        });
    }
}

// Animate block destruction
function animateBlockDestruction(block, onComplete) {
    const originalScale = block.mesh.scale.clone();
    const duration = 500; // milliseconds
    const startTime = Date.now();
    
    const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Shrink block
        const scale = 1 - progress * 0.8; // Shrink to 20% of original size
        block.mesh.scale.set(scale, scale, scale);
        
        // Make transparent
        if (Array.isArray(block.mesh.material)) {
            block.mesh.material.forEach(mat => {
                mat.opacity = 1 - progress * 0.9;
                mat.transparent = true;
            });
        } else {
            block.mesh.material.opacity = 1 - progress * 0.9;
            block.mesh.material.transparent = true;
        }
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // Remove the block mesh after animation
            scene.remove(block.mesh);
            if (onComplete) onComplete();
        }
    };
    
    animate();
}

// Create a Kaspa coin indicator after block destruction (like a spinning coin)
function createKaspaIndicator(x, y, z) {
    const size = gameGrid.length;
    const spacing = 1;
    const offset = (size - 1) * spacing / 2;
    
    // Create a thin cylinder (like a coin) with Kaspa texture
    const geometry = new THREE.CylinderGeometry(0.2, 0.2, 0.05, 16);
    let material;
    
    if (kaspaTexture) {
        // Create materials for the coin faces
        const kaspaTexturedMaterial = new THREE.MeshBasicMaterial({ 
            map: kaspaTexture,
            color: 0xffffff,
            transparent: true
        });
        const edgeMaterial = new THREE.MeshBasicMaterial({ 
            color: COLORS.kaspa,
            transparent: true
        });
        
        // Array of materials: [side, top, bottom]
        material = [edgeMaterial, kaspaTexturedMaterial, kaspaTexturedMaterial];
    } else {
        // Fallback to solid color
        material = new THREE.MeshBasicMaterial({ 
            color: COLORS.kaspa,
            transparent: true
        });
    }
    
    const indicator = new THREE.Mesh(geometry, material);
    indicator.position.set(
        x * spacing - offset,
        y * spacing - offset,
        z * spacing - offset
    );
    
    // Rotate the coin to be vertical initially
    indicator.rotation.x = Math.PI / 2;
    
    indicator.userData = { isGameBlock: true, isIndicator: true };
    scene.add(indicator);
    
    // Coin spinning animation (like a coin flip)
    const originalY = indicator.position.y;
    const animate = () => {
        if (indicator.parent) {
            // Floating motion
            indicator.position.y = originalY + Math.sin(Date.now() * 0.003) * 0.1;
            
            // Spinning motion (around Y axis for coin flip effect)
            indicator.rotation.y += 0.05;
            
            // Slight wobble on X axis for more realistic coin motion
            indicator.rotation.x = Math.PI / 2 + Math.sin(Date.now() * 0.002) * 0.1;
            
            requestAnimationFrame(animate);
        }
    };
    animate();
}

// Revelation propagation (flood fill)
function propagateReveal(x, y, z) {
    const size = gameGrid.length;
    const queue = [{ x, y, z }];
    const visited = new Set();
    
    while (queue.length > 0) {
        const current = queue.shift();
        const key = `${current.x},${current.y},${current.z}`;
        
        if (visited.has(key)) continue;
        visited.add(key);
        
        // Check neighbors
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dz = -1; dz <= 1; dz++) {
                    if (dx === 0 && dy === 0 && dz === 0) continue;
                    
                    const nx = current.x + dx;
                    const ny = current.y + dy;
                    const nz = current.z + dz;
                    
                    if (nx >= 0 && nx < size && ny >= 0 && ny < size && nz >= 0 && nz < size) {
                        const neighbor = gameGrid[nx][ny][nz];
                        
                        if (!neighbor.revealed && neighbor.type !== BLOCK_TYPES.TRAP) {
                            neighbor.revealed = true;
                            gameState.revealedBlocks++;
                            
                            if (neighbor.type === BLOCK_TYPES.KASPA) {
                                revealKaspa(nx, ny, nz);
                                gameState.kasCollected++;
                            } else {
                                revealEmpty(nx, ny, nz);
                                
                                // Continue propagation if no adjacent traps
                                if (neighbor.neighborTraps === 0) {
                                    queue.push({ x: nx, y: ny, z: nz });
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// Victory conditions check
function checkVictory() {
    let revealedSafeBlocks = 0;
    
    const size = gameGrid.length;
    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
            for (let z = 0; z < size; z++) {
                const block = gameGrid[x][y][z];
                if (block.revealed && block.type !== BLOCK_TYPES.TRAP) {
                    revealedSafeBlocks++;
                }
            }
        }
    }
    
    // Victory if all safe blocks are revealed
    if (revealedSafeBlocks === gameState.totalSafeBlocks) {
        gameOver(true);
    }
}

// Game over
function gameOver(victory) {
    gameState.isPlaying = false;
    gameState.isGameOver = true;
    
    if (victory) {
        updateStatus('🎉 Victory! You found all Kaspa blocks!');
        saveBestTime();
        showModal('Victory!', 
                 `Congratulations! You won in ${formatTime(gameState.currentTime)}!`,
                 `Kas collected: ${gameState.kasCollected}/${gameState.totalKasBlocks}<br>Time: ${formatTime(gameState.currentTime)}`);
    } else {
        updateStatus('💥 Defeat! You hit a trap!');
        showModal('Defeat!', 
                 'Too bad! You hit a trap.',
                 `Kas collected: ${gameState.kasCollected}/${gameState.totalKasBlocks}<br>Time: ${formatTime(gameState.currentTime)}`);
        
        // Reveal all traps
        revealAllTraps();
    }
}

// Reveal all traps on defeat
function revealAllTraps() {
    const size = gameGrid.length;
    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
            for (let z = 0; z < size; z++) {
                const block = gameGrid[x][y][z];
                if (block.type === BLOCK_TYPES.TRAP && !block.revealed) {
                    block.mesh.material.color.setHex(COLORS.trap);
                    block.mesh.material.opacity = 0.7;
                    block.mesh.material.transparent = true;
                }
            }
        }
    }
}

// Timer management
function startTimer() {
    const timer = setInterval(() => {
        if (gameState.isPlaying && !gameState.isGameOver) {
            gameState.currentTime = Date.now() - gameState.startTime;
            updateTimeDisplay();
        } else {
            clearInterval(timer);
        }
    }, 100);
}

// Update time display
function updateTimeDisplay() {
    document.getElementById('time-display').textContent = formatTime(gameState.currentTime);
}

// Time formatting
function formatTime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Update user interface
function updateUI() {
    document.getElementById('kas-count').textContent = `${gameState.kasCollected}/${gameState.totalKasBlocks}`;
    updateTimeDisplay();
}

// Update status message
function updateStatus(message) {
    document.getElementById('status-message').textContent = message;
}

// Show modal
function showModal(title, message, stats) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    document.getElementById('modal-stats').innerHTML = stats;
    document.getElementById('game-over-modal').style.display = 'block';
}

// Hide modal
function hideModal() {
    document.getElementById('game-over-modal').style.display = 'none';
}

// Save best time
function saveBestTime() {
    const currentBest = localStorage.getItem('kaspa-miner-best-time');
    if (!currentBest || gameState.currentTime < parseInt(currentBest)) {
        localStorage.setItem('kaspa-miner-best-time', gameState.currentTime.toString());
        updateBestTimeDisplay();
    }
}

// Load best time
function loadBestTime() {
    updateBestTimeDisplay();
}

// Update best time display
function updateBestTimeDisplay() {
    const bestTime = localStorage.getItem('kaspa-miner-best-time');
    const display = document.getElementById('best-time-display');
    if (bestTime) {
        display.textContent = formatTime(parseInt(bestTime));
    } else {
        display.textContent = '--:--';
    }
}

// Window resize
function onWindowResize() {
    const gameContainer = document.getElementById('game-container');
    const width = gameContainer.clientWidth;
    const height = gameContainer.clientHeight;
    
    // Update camera aspect ratio
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    // Update renderer size
    renderer.setSize(width, height);
}

// Main animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Render the scene
    renderer.render(scene, camera);
}

// Initialize the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    init();
    animate();
});
