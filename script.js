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

// Mobile detection and touch variables
let isMobile = false;
let touchStartTime = 0;
let touchStartPosition = { x: 0, y: 0 };
let touchMoved = false;
const touchMoveThreshold = 15;
const touchTimeThreshold = 300;

// Camera control variables (used by both mouse and touch)
let isDragging = false;
let hasDragged = false;
let previousPosition = { x: 0, y: 0 };
let dragStartPosition = { x: 0, y: 0 };
let cameraDistance = 10;
let cameraAngleX = 0; 
let cameraAngleY = 0;
const dragThreshold = 15;
let inputStartTime = 0;
const clickTimeThreshold = 300;

// Game initialization
function init() {
    detectMobile();
    setupThreeJS();
    setupControls();
    setupEventListeners();
    setupMobileControls();
    loadBestTime();
    startNewGame();
}

// Mobile detection
function detectMobile() {
    isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
    
    if (isMobile) {
        // Hide all instructions on mobile
        document.getElementById('desktop-instructions').style.display = 'none';
        document.getElementById('mobile-instructions').style.display = 'none';
        
        // Also hide mobile controls because we'll use touch gestures
        if (document.getElementById('mobile-controls')) {
            document.getElementById('mobile-controls').style.display = 'none';
        }
    }
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
    
// Create Kaspa texture with a canvas (to avoid CORS issues)
    kaspaTexture = createKaspaTexture();
    console.log('Kaspa texture created');

// Create a Kaspa texture using canvas (to avoid CORS issues)
function createKaspaTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Fill background with dark color
    ctx.fillStyle = '#222222'; // Dark background
    ctx.fillRect(0, 0, 256, 256);
    
    // Draw a K with a coin/circle shape
    ctx.fillStyle = '#71C7BA'; // Kaspa teal color for the circle
    
    // Draw the circle
    ctx.beginPath();
    ctx.arc(128, 128, 90, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw the inverted K shape (like in the Kaspa logo)
    ctx.fillStyle = '#FFFFFF'; // White color for the K
    ctx.beginPath();
    
    // Right vertical bar of inverted K
    ctx.rect(143, 68, 20, 120);
    
    // Upper diagonal of inverted K (going left)
    ctx.moveTo(143, 128);
    ctx.lineTo(93, 68);
    ctx.lineTo(83, 88);
    ctx.lineTo(123, 138);
    ctx.closePath();
    
    // Lower diagonal of inverted K (going left)
    ctx.moveTo(143, 128);
    ctx.lineTo(93, 188);
    ctx.lineTo(103, 198);
    ctx.lineTo(143, 148);
    ctx.closePath();
    
    ctx.fill();
    
    // No more border around the circle
    
    return new THREE.CanvasTexture(canvas);
}
    
    // Raycaster for interaction
    raycaster = new THREE.Raycaster();
}

// Camera controls setup (unified for mouse and touch)
function setupControls() {
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
    
    // Mouse events
    renderer.domElement.addEventListener('mousedown', function(e) {
        if (e.button === 0) { // Left click
            startDrag(e.clientX, e.clientY);
        }
    });
    
    renderer.domElement.addEventListener('mousemove', function(e) {
        if (isDragging) {
            handleDrag(e.clientX, e.clientY);
        }
    });
    
    renderer.domElement.addEventListener('mouseup', function(e) {
        if (e.button === 0) {
            endDrag(e.clientX, e.clientY, e);
        }
    });
    
    // Touch events
    let pinchStartDistance = 0;
    
    renderer.domElement.addEventListener('touchstart', function(e) {
        e.preventDefault();
        
        if (e.touches.length === 1) {
            // Single touch - rotate
            const touch = e.touches[0];
            startDrag(touch.clientX, touch.clientY);
        } 
        else if (e.touches.length === 2) {
            // Two touches - pinch to zoom
            isDragging = false; // Stop drag if it was happening
            
            // Calculate initial pinch distance
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            pinchStartDistance = Math.hypot(
                touch1.clientX - touch2.clientX,
                touch1.clientY - touch2.clientY
            );
        }
    }, { passive: false });
    
    renderer.domElement.addEventListener('touchmove', function(e) {
        e.preventDefault();
        
        if (e.touches.length === 1 && isDragging) {
            // Single touch - handle rotation
            const touch = e.touches[0];
            handleDrag(touch.clientX, touch.clientY);
        } 
        else if (e.touches.length === 2) {
            // Two touches - handle zoom
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            
            // Calculate current pinch distance
            const currentDistance = Math.hypot(
                touch1.clientX - touch2.clientX,
                touch1.clientY - touch2.clientY
            );
            
            // Determine zoom direction and amount
            if (pinchStartDistance > 0) {
                const zoomAmount = (pinchStartDistance - currentDistance) * 0.05;
                cameraDistance = Math.max(8, Math.min(25, cameraDistance + zoomAmount));
                window.updateCameraPosition();
            }
            
            // Update for next move
            pinchStartDistance = currentDistance;
        }
    }, { passive: false });
    
    renderer.domElement.addEventListener('touchend', function(e) {
        e.preventDefault();
        
        // Reset pinch distance when fingers are lifted
        if (e.touches.length < 2) {
            pinchStartDistance = 0;
        }
        
        // Handle end of rotation drag
        if (isDragging && e.touches.length === 0) {
            endDrag(previousPosition.x, previousPosition.y, e);
        }
    }, { passive: false });
    
    // Unified drag functions
    function startDrag(x, y) {
        isDragging = true;
        hasDragged = false;
        inputStartTime = Date.now();
        previousPosition = { x, y };
        dragStartPosition = { x, y };
    }
    
    function handleDrag(x, y) {
        if (!isDragging) return;
        
        const totalDragDistance = Math.sqrt(
            Math.pow(x - dragStartPosition.x, 2) + 
            Math.pow(y - dragStartPosition.y, 2)
        );
        
        // If moved more than threshold pixels from start, it's a drag
        if (totalDragDistance > dragThreshold) {
            if (!hasDragged) {
                hasDragged = true;
            }
            
            const deltaMove = {
                x: x - previousPosition.x,
                y: y - previousPosition.y
            };
            
            cameraAngleY += deltaMove.x * 0.01;
            cameraAngleX += deltaMove.y * 0.01;
            
            // Limit vertical angle
            cameraAngleX = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, cameraAngleX));
            
            updateCameraPosition();
            previousPosition = { x, y };
        }
    }
    
    function endDrag(x, y, event) {
        if (!isDragging) return;
        
        const clickDuration = Date.now() - inputStartTime;
        
        // Only treat as click/tap if:
        // 1. No dragging occurred
        // 2. Input was held down for less than clickTimeThreshold
        if (!hasDragged && clickDuration < clickTimeThreshold) {
            // Small delay to ensure this is really a click and not start of drag
            setTimeout(() => {
                if (!hasDragged) {
                    handleBlockClick(event, x, y);
                }
            }, 10);
        }
        
        isDragging = false;
        hasDragged = false;
    }
    
    // Zoom with scroll wheel (desktop only)
    renderer.domElement.addEventListener('wheel', function(e) {
        e.preventDefault();
        cameraDistance += e.deltaY * 0.01;
        cameraDistance = Math.max(8, Math.min(25, cameraDistance));
        updateCameraPosition();
    });
    
    // Store updateCameraPosition function for mobile zoom buttons
    window.updateCameraPosition = updateCameraPosition;
}

// Mobile controls setup
function setupMobileControls() {
    if (!isMobile) return;
    
    // Zoom in button
    document.getElementById('zoom-in-btn').addEventListener('touchstart', function(e) {
        e.preventDefault();
        zoomCamera(-1);
    }, { passive: false });
    
    document.getElementById('zoom-in-btn').addEventListener('click', function(e) {
        e.preventDefault();
        zoomCamera(-1);
    });
    
    // Zoom out button
    document.getElementById('zoom-out-btn').addEventListener('touchstart', function(e) {
        e.preventDefault();
        zoomCamera(1);
    }, { passive: false });
    
    document.getElementById('zoom-out-btn').addEventListener('click', function(e) {
        e.preventDefault();
        zoomCamera(1);
    });
    
    // Touch helper close button
    const touchHelperClose = document.getElementById('touch-helper-close');
    if (touchHelperClose) {
        touchHelperClose.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            document.getElementById('touch-helper').classList.remove('show');
            localStorage.setItem('kaspa-miner-touch-helper-shown', 'true');
        });
        
        touchHelperClose.addEventListener('touchend', function(e) {
            e.preventDefault();
            e.stopPropagation();
            document.getElementById('touch-helper').classList.remove('show');
            localStorage.setItem('kaspa-miner-touch-helper-shown', 'true');
        });
    }
    
    function zoomCamera(direction) {
        cameraDistance += direction * 2;
        cameraDistance = Math.max(8, Math.min(25, cameraDistance));
        window.updateCameraPosition();
        
        // Add visual feedback
        const btn = direction < 0 ? document.getElementById('zoom-in-btn') : document.getElementById('zoom-out-btn');
        btn.classList.add('tap-feedback');
        setTimeout(() => btn.classList.remove('tap-feedback'), 200);
    }
}

// Block click handling (updated for touch support)
function handleBlockClick(event, x, y) {
    if (!gameState.isPlaying || gameState.isGameOver) return;
    
    // Calculate coordinates
    const rect = renderer.domElement.getBoundingClientRect();
    let mouseX, mouseY;
    
    if (x !== undefined && y !== undefined) {
        // Coordinates provided (from unified touch/mouse handler)
        mouseX = ((x - rect.left) / rect.width) * 2 - 1;
        mouseY = -((y - rect.top) / rect.height) * 2 + 1;
    } else {
        // Fallback to event coordinates
        mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }
    
    // Raycast to detect clicked block
    const mouseVector = new THREE.Vector2(mouseX, mouseY);
    raycaster.setFromCamera(mouseVector, camera);
    
    // Filter objects to only take game blocks (excluding numbered blocks marked as ignoreClick)
    const gameBlocks = [];
    scene.traverse((child) => {
        if (child.userData && child.userData.isGameBlock && 
            !child.userData.isIndicator && 
            !child.userData.ignoreClick) {
            gameBlocks.push(child);
        }
    });
    
    const intersects = raycaster.intersectObjects(gameBlocks);
    
    if (intersects.length > 0) {
        const clickedBlock = intersects[0].object;
        const gridX = clickedBlock.userData.gridX;
        const gridY = clickedBlock.userData.gridY;
        const gridZ = clickedBlock.userData.gridZ;
        
        if (gridX !== undefined && gridY !== undefined && gridZ !== undefined) {
            // Check if it's a visible trap block (revealed by adjacent blocks)
            const block = gameGrid[gridX][gridY][gridZ];
            
            // If it's a trap and it's visible (red), trigger the explosion
            if (block.type === BLOCK_TYPES.TRAP && block.revealed) {
                // Trigger the explosion
                gameOver(false);
                return;
            }
            
            // Otherwise, reveal the block normally
            revealBlock(gridX, gridY, gridZ);
            
            // Add visual feedback for mobile
            if (isMobile) {
                clickedBlock.userData.originalScale = clickedBlock.scale.clone();
                clickedBlock.scale.multiplyScalar(1.1);
                setTimeout(() => {
                    if (clickedBlock.userData.originalScale) {
                        clickedBlock.scale.copy(clickedBlock.userData.originalScale);
                    }
                }, 150);
            }
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
    
    // Prevent context menu on touch devices
    if (isMobile) {
        document.addEventListener('contextmenu', function(e) {
            e.preventDefault();
        });
        
        // Prevent default touch behaviors
        document.body.addEventListener('touchstart', function(e) {
            if (e.target.closest('#game-container')) {
                e.preventDefault();
            }
        }, { passive: false });
        
        document.body.addEventListener('touchend', function(e) {
            if (e.target.closest('#game-container')) {
                e.preventDefault();
            }
        }, { passive: false });
        
        document.body.addEventListener('touchmove', function(e) {
            if (e.target.closest('#game-container')) {
                e.preventDefault();
            }
        }, { passive: false });
    }
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
    updateStatus('New game started! ' + (isMobile ? 'Tap' : 'Click') + ' on a block to begin.');
    
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
                    
                    // Check only the 6 direct neighbors (that share a face)
                    const directions = [
                        {dx: -1, dy: 0, dz: 0}, // left
                        {dx: 1, dy: 0, dz: 0},  // right
                        {dx: 0, dy: -1, dz: 0}, // bottom
                        {dx: 0, dy: 1, dz: 0},  // top
                        {dx: 0, dy: 0, dz: -1}, // back
                        {dx: 0, dy: 0, dz: 1}   // front
                    ];
                    
                    for (const dir of directions) {
                        const nx = x + dir.dx;
                        const ny = y + dir.dy;
                        const nz = z + dir.dz;
                        
                        if (nx >= 0 && nx < size && ny >= 0 && ny < size && nz >= 0 && nz < size) {
                            if (gameGrid[nx][ny][nz].type === BLOCK_TYPES.TRAP) {
                                trapCount++;
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
    
    // Add a vertical offset for mobile devices to center the cube better
    const mobileVerticalOffset = isMobile ? 1.5 : 0;
    
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
                    y * spacing - offset + mobileVerticalOffset, // Add vertical offset for mobile
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
    
    // Change material to red for trap blocks
    if (Array.isArray(block.mesh.material)) {
        block.mesh.material.forEach(mat => {
            mat.color.setHex(COLORS.trap);
        });
    } else {
        block.mesh.material.color.setHex(COLORS.trap);
    }
    
    // Initial explosion animation
    const originalScale = block.mesh.scale.clone();
    block.mesh.scale.multiplyScalar(1.2);
    
    setTimeout(() => {
        if (block.mesh.scale) {
            block.mesh.scale.copy(originalScale);
            
            // Set this trap for pulse animation if neighbor blocks are revealed
            block.pulsing = true;
            checkTrapPulseCondition(x, y, z);
        }
    }, 200);
}

// Check if a trap should pulse (if neighboring blocks are revealed)
function checkTrapPulseCondition(x, y, z) {
    const size = gameGrid.length;
    const block = gameGrid[x][y][z];
    
    // Only pulse if this is a revealed trap
    if (!block.revealed || block.type !== BLOCK_TYPES.TRAP) return;
    
    let revealedNeighbors = 0;
    let totalNeighbors = 0;
    
    // Check all 26 possible neighbors in 3D
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dz = -1; dz <= 1; dz++) {
                if (dx === 0 && dy === 0 && dz === 0) continue;
                
                const nx = x + dx;
                const ny = y + dy;
                const nz = z + dz;
                
                if (nx >= 0 && nx < size && ny >= 0 && ny < size && nz >= 0 && nz < size) {
                    totalNeighbors++;
                    if (gameGrid[nx][ny][nz].revealed) {
                        revealedNeighbors++;
                    }
                }
            }
        }
    }
    
    // Pulse if at least some neighbors are revealed
    if (revealedNeighbors > 0) {
        startTrapPulseAnimation(block);
    }
}

// Pulse animation for traps
function startTrapPulseAnimation(block) {
    if (!block.pulsing) return;
    
    // Create pulse animation
    const pulseAnimation = () => {
        if (!block.mesh || !block.pulsing) return;
        
        // Sine wave for smooth pulse (0.95 to 1.05 scale)
        const pulseScale = 1 + 0.05 * Math.sin(Date.now() * 0.005);
        block.mesh.scale.set(pulseScale, pulseScale, pulseScale);
        
        // Continue animation
        requestAnimationFrame(pulseAnimation);
    };
    
    // Start the animation
    pulseAnimation();
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
        const numberMaterial = new THREE.MeshLambertMaterial({ 
            map: numberTexture,
            transparent: true,
            opacity: 0.6
        });
        const materials = [
            numberMaterial, numberMaterial, numberMaterial,
            numberMaterial, numberMaterial, numberMaterial
        ];
        block.mesh.material = materials;
        
        // Mark this block as "click-insensitive"
        block.mesh.userData.ignoreClick = true;
        
        // Check adjacent traps to update their pulse state
        activateAdjacentTrapsPulse(x, y, z);
    } else {
        // Empty block with no adjacent traps - destroy it like Kaspa blocks
        animateBlockDestruction(block, () => {
            // Check adjacent traps to update their pulse state
            activateAdjacentTrapsPulse(x, y, z);
        });
    }
}

// Activate pulse on adjacent trap blocks
function activateAdjacentTrapsPulse(x, y, z) {
    const size = gameGrid.length;
    
    // Check each trap in the grid
    for (let tx = 0; tx < size; tx++) {
        for (let ty = 0; ty < size; ty++) {
            for (let tz = 0; tz < size; tz++) {
                // Check only unrevealed traps
                if (gameGrid[tx][ty][tz].type !== BLOCK_TYPES.TRAP || gameGrid[tx][ty][tz].revealed) continue;
                
                // Check if all non-trap adjacent blocks are revealed
                let allNonTrapNeighborsRevealed = true;
                let hasNonTrapNeighbor = false;
                
                // Check only the 6 direct neighbors (that share a face)
                const directions = [
                    {dx: -1, dy: 0, dz: 0}, // left
                    {dx: 1, dy: 0, dz: 0},  // right
                    {dx: 0, dy: -1, dz: 0}, // bottom
                    {dx: 0, dy: 1, dz: 0},  // top
                    {dx: 0, dy: 0, dz: -1}, // back
                    {dx: 0, dy: 0, dz: 1}   // front
                ];
                
                for (const dir of directions) {
                    const nx = tx + dir.dx;
                    const ny = ty + dir.dy;
                    const nz = tz + dir.dz;
                    
                    // Check if the neighbor is within the grid boundaries
                    if (nx >= 0 && nx < size && ny >= 0 && ny < size && nz >= 0 && nz < size) {
                        const neighbor = gameGrid[nx][ny][nz];
                        
                        // If it's a non-trap block
                        if (neighbor.type !== BLOCK_TYPES.TRAP) {
                            hasNonTrapNeighbor = true;
                            
                            // If this block is not revealed, the trap should not be visible
                            if (!neighbor.revealed) {
                                allNonTrapNeighborsRevealed = false;
                                break;
                            }
                        }
                    }
                }
                
                // If all adjacent non-trap blocks are revealed, reveal the trap
                if (hasNonTrapNeighbor && allNonTrapNeighborsRevealed) {
                    const trapBlock = gameGrid[tx][ty][tz];
                    
                    // Mark as revealed and make it pulse
                    trapBlock.revealed = true;
                    trapBlock.pulsing = true;
                    
                    // Make the trap visible (red and pulsing)
                    if (trapBlock.mesh) {
                        if (Array.isArray(trapBlock.mesh.material)) {
                            trapBlock.mesh.material.forEach(mat => {
                                mat.color.setHex(COLORS.trap);
                            });
                        } else {
                            trapBlock.mesh.material.color.setHex(COLORS.trap);
                        }
                        startTrapPulseAnimation(trapBlock);
                    }
                }
            }
        }
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

// Revelation propagation (flood fill) - Balanced version
function propagateReveal(x, y, z) {
    const size = gameGrid.length;
    const queue = [{ x, y, z }];
    const visited = new Set();
    
    // Define only the 6 direct neighbors (that share a face)
    const directions = [
        {dx: -1, dy: 0, dz: 0}, // left
        {dx: 1, dy: 0, dz: 0},  // right
        {dx: 0, dy: -1, dz: 0}, // bottom
        {dx: 0, dy: 1, dz: 0},  // top
        {dx: 0, dy: 0, dz: -1}, // back
        {dx: 0, dy: 0, dz: 1}   // front
    ];
    
    // Limite de propagation - équilibre entre trop facile et trop difficile
    let blocksRevealed = 0;
    const maxPropagationBlocks = 12 + Math.floor(Math.random() * 4); // 12-15 blocs maximum
    
    // Profondeur maximum - évite la propagation excessive dans une seule direction
    const maxDepth = 3;
    const depths = {};
    depths[`${x},${y},${z}`] = 0;
    
    while (queue.length > 0 && blocksRevealed < maxPropagationBlocks) {
        const current = queue.shift();
        const key = `${current.x},${current.y},${current.z}`;
        const currentDepth = depths[key];
        
        if (visited.has(key)) continue;
        visited.add(key);
        
        // Vérifier seulement les 6 voisins directs dans un ordre prévisible
        for (const dir of directions) {
            const nx = current.x + dir.dx;
            const ny = current.y + dir.dy;
            const nz = current.z + dir.dz;
            const newKey = `${nx},${ny},${nz}`;
            
            if (nx >= 0 && nx < size && ny >= 0 && ny < size && nz >= 0 && nz < size) {
                const neighbor = gameGrid[nx][ny][nz];
                
                // Ne révéler que les blocs vides (ni pièges, ni Kaspa)
                if (!neighbor.revealed && neighbor.type === BLOCK_TYPES.EMPTY) {
                    neighbor.revealed = true;
                    gameState.revealedBlocks++;
                    blocksRevealed++;
                    
                    revealEmpty(nx, ny, nz);
                    
                    // Continue propagation if no adjacent traps, but with depth and block limits
                    if (neighbor.neighborTraps === 0 && blocksRevealed < maxPropagationBlocks) {
                        // Éviter de propager trop profondément dans une direction
                        if (currentDepth < maxDepth) {
                            depths[newKey] = currentDepth + 1;
                            queue.push({ x: nx, y: ny, z: nz });
                        }
                    }
                }
            }
        }
    }
}

// Victory conditions check
function checkVictory() {
    // Victoire si tous les blocs Kaspa sont collectés
    if (gameState.kasCollected === gameState.totalKasBlocks) {
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
        
        // Instead of showing a popup, create an explosion animation
        createExplosionAnimation();
        
        // After animation, we'll restart the game
        setTimeout(() => {
            startNewGame();
        }, 2000); // 2 seconds of explosion animation
    }
}

// Create an explosion animation when player hits a trap
function createExplosionAnimation() {
    const size = gameGrid.length;
    const spacing = 1;
    const offset = (size - 1) * spacing / 2;
    
    // Make all blocks explode outward
    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
            for (let z = 0; z < size; z++) {
                const block = gameGrid[x][y][z];
                
                if (block.mesh) {
                    // Set all blocks to red (trap color)
                    if (Array.isArray(block.mesh.material)) {
                        block.mesh.material.forEach(mat => {
                            mat.color.setHex(COLORS.trap);
                        });
                    } else {
                        block.mesh.material.color.setHex(COLORS.trap);
                    }
                    
                    // Add random velocity to each block
                    const velocity = {
                        x: (Math.random() - 0.5) * 0.5,
                        y: (Math.random() - 0.5) * 0.5 + 0.2, // Bias upward
                        z: (Math.random() - 0.5) * 0.5
                    };
                    
                    // Add random rotation
                    const rotationVelocity = {
                        x: (Math.random() - 0.5) * 0.2,
                        y: (Math.random() - 0.5) * 0.2,
                        z: (Math.random() - 0.5) * 0.2
                    };
                    
                    // Store original position for reference
                    const originalPosition = block.mesh.position.clone();
                    
                    // Animation function
                    const animateExplosion = () => {
                        if (!block.mesh) return; // Stop if block is removed
                        
                        // Update position based on velocity
                        block.mesh.position.x += velocity.x;
                        block.mesh.position.y += velocity.y;
                        block.mesh.position.z += velocity.z;
                        
                        // Add gravity effect
                        velocity.y -= 0.01;
                        
                        // Add rotation
                        block.mesh.rotation.x += rotationVelocity.x;
                        block.mesh.rotation.y += rotationVelocity.y;
                        block.mesh.rotation.z += rotationVelocity.z;
                        
                        // Shrink block gradually
                        if (block.mesh.scale.x > 0.01) {
                            block.mesh.scale.multiplyScalar(0.97);
                        } else {
                            scene.remove(block.mesh);
                            return; // Stop animation when block is too small
                        }
                        
                        // Continue animation
                        requestAnimationFrame(animateExplosion);
                    };
                    
                    // Start animation with a slight delay based on distance from center
                    const distanceFromCenter = Math.sqrt(
                        Math.pow(x - size/2, 2) + 
                        Math.pow(y - size/2, 2) + 
                        Math.pow(z - size/2, 2)
                    );
                    
                    setTimeout(() => {
                        animateExplosion();
                    }, distanceFromCenter * 50); // Delay based on distance
                }
            }
        }
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
