const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let allNodes = []; // All PCs ever created
let activeNodes = []; // PCs that are currently in the ring
const connections = [];
let radius = 200;
const nodeRadius = 50; // Increased from 35 to 50
const nodeImageSize = nodeRadius * 1.8; // Adjusted for larger image
let animationFrameId = null;
let pcImage = null;
let centerX, centerY;
const MAX_LOG_ENTRIES = 100;

// Network statistics variables
let dataTransmissionsCount = 0;
let acknowledgementsCount = 0;

// Define the token object
let token = {
    x: 0,
    y: 0,
    currentActiveNodeId: null, // Stores the ID of the active node the token is currently at
    progress: 0,
    speed: 0.01, // Speed of token circulation
    isFree: true,
    data: null, // Data being carried by the token
    sourceIP: null,
    destIP: null,
    isAck: false, // True if the token is carrying an acknowledgment
    direction: 1 // 1 for forward, -1 for backward (for ack)
};

function init() {
    console.log('Initializing application...'); // Debug log
    resizeCanvas();
    loadPCImage();
    window.addEventListener('resize', resizeCanvas);
    setupPanelToggle();
    setupClearLog();
    // updateRingStatus(); // This will be called after nodes are added
    
    // Clear any existing log entries
    const logContent = document.getElementById('activityLog');
    if (logContent) {
        logContent.innerHTML = '';
        console.log('Activity log container found and cleared'); // Debug log
    } else {
        console.error('Activity log container not found!'); // Debug log
    }
    
    // Add initial log entry
    addLogEntry('System initialized and ready', 'success');

    // Add 6 PCs at the start
    for (let i = 0; i < 6; i++) {
        addNode();
    }
    
    // Initial setup of token position based on the first active node
    if (activeNodes.length > 0) {
        token.currentActiveNodeId = activeNodes[0].id; // Set ID of the first node
        token.x = activeNodes[0].x;
        token.y = activeNodes[0].y;
    }

    updateRingStatus(); // Call after all nodes are added
    updateNetworkStats(); // Call to update stats on init
    
    // Start token circulation
    animateToken();
}

function setupPanelToggle() {
    const panelToggle = document.querySelector('.panel-toggle');
    const panelContent = document.querySelector('.panel-content');
    
    if (panelToggle && panelContent) {
        panelToggle.addEventListener('click', () => {
            const isVisible = panelContent.style.display !== 'none';
            panelContent.style.display = isVisible ? 'none' : 'block';
            addLogEntry(`Control panel ${isVisible ? 'collapsed' : 'expanded'}`, 'info');
        });
    }
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    centerX = canvas.width / 2;
    centerY = canvas.height / 2;
    const minDimension = Math.min(canvas.width, canvas.height);
    radius = Math.min(minDimension * 0.35, 350); // Slightly larger ring
    drawNetwork();
}

function loadPCImage() {
    pcImage = new Image();
    pcImage.onload = () => {
        console.log('PC image loaded successfully');
        drawNetwork();
    };
    pcImage.onerror = () => {
        console.log('Failed to load PC image, using fallback');
        createPCIcon();
    };
    pcImage.src = 'images/sysunit.png';
}

function createPCIcon() {
    const iconCanvas = document.createElement('canvas');
    iconCanvas.width = 100; // Increased for larger icon
    iconCanvas.height = 100;
    const iconCtx = iconCanvas.getContext('2d');
    
    iconCtx.beginPath();
    iconCtx.arc(50, 50, 45, 0, 2 * Math.PI); // Adjusted for larger size
    iconCtx.fillStyle = '#0077b6';
    iconCtx.fill();
    
    iconCtx.beginPath();
    iconCtx.arc(50, 50, 38, 0, 2 * Math.PI);
    iconCtx.fillStyle = '#00b4d8';
    iconCtx.fill();
    
    iconCtx.fillStyle = '#ffffff';
    iconCtx.font = 'bold 20px Arial'; // Larger font
    iconCtx.textAlign = 'center';
    iconCtx.textBaseline = 'middle';
    iconCtx.fillText('PC', 50, 50);
    
    pcImage = iconCanvas;
    drawNetwork();
}

function generateIPAddress(index) {
    return `PC${index + 1} 192.168.1.${index + 1}`;
}

function addNode() {
    if (activeNodes.length >= 12) { // Max 10 active PCs on the ring
        updateStatus('Maximum 12 active PCs allowed in the ring topology', 'error');
        addLogEntry('Failed to add PC: Maximum active limit reached', 'error');
        return;
    }
    
    // Break all existing connections before adding new node
    connections.forEach(conn => {
        conn.isActive = false;
    });
    
    const newNode = { 
        id: allNodes.length + 1, // Unique and persistent ID
        ip: generateIPAddress(allNodes.length), // Unique and persistent IP
        isOn: true,
        status: 'active', // New status property
        x: 0,
        y: 0,
        angle: 0
    };
    
    allNodes.push(newNode);
    activeNodes.push(newNode); // Add to active nodes
    
    // Show connection breaking status
    updateStatus('Breaking existing connections...', 'warning');
    addLogEntry('Breaking existing connections for new node integration', 'warning');
    drawNetwork();
    
    // Add a small delay before rebuilding connections to show the disruption
    setTimeout(() => {
        // Show restarting status
        updateStatus('Restarting connections...', 'warning');
        addLogEntry('Restarting connections with new node', 'warning');
        drawNetwork();
        
        // Another small delay before actually rebuilding
        setTimeout(() => {
            rebuildConnections(); // Rebuild connections based on active nodes
            updateNodeSelects();
            updateNodeList();
            drawNetwork();
            updateRingStatus();
            updateStatus(`PC ${newNode.ip} added successfully. Total active PCs: ${activeNodes.length}`, 'success');
            addLogEntry(`PC ${newNode.ip} added to the network`, 'success');
            updateNetworkStats();
            realignTokenPosition(); // Realign token after node added
        }, 500);
    }, 500); // 500ms delay to show the disruption
}

function removeNode(id) {
    const nodeToRemove = allNodes.find(node => node.id === id);
    if (!nodeToRemove) {
        updateStatus('PC not found to remove', 'error');
        addLogEntry('Failed to remove PC: Not found', 'error');
        return;
    }

    if (activeNodes.length <= 2) {
        updateStatus('Cannot remove PC: At least two active PCs are required in the ring', 'warning');
        addLogEntry('Failed to remove PC: Minimum PC limit reached', 'warning');
        return;
    }

    nodeToRemove.status = 'removed'; // Mark as removed
    const removedIP = nodeToRemove.ip;

    // Remove from active nodes array
    activeNodes = activeNodes.filter(node => node.id !== id);

    rebuildConnections(); // Rebuild connections based on active nodes
    
    updateNodeSelects();
    updateNodeList();
    drawNetwork();
    updateRingStatus();
    updateStatus(`PC ${removedIP} removed from the ring. Total active PCs: ${activeNodes.length}`, 'success');
    addLogEntry(`PC ${removedIP} removed from the ring`, 'success');
    updateNetworkStats();
    realignTokenPosition(); // Realign token after node removed
}

function recoverNode(nodeToRecover) {
    if (activeNodes.length >= 12) {
        updateStatus('Cannot recover PC: Maximum 12 active PCs allowed in the ring topology', 'error');
        addLogEntry('Failed to recover PC: Maximum active limit reached', 'error');
        return;
    }

    if (nodeToRecover.status !== 'removed') {
        updateStatus('PC is not in a removable state', 'warning');
        addLogEntry('Failed to recover PC: Not in removed state', 'warning');
        return;
    }

    nodeToRecover.status = 'active';
    nodeToRecover.isOn = true; // Recovered PCs are online by default
    activeNodes.push(nodeToRecover); // Add back to active nodes
    // Sort activeNodes by ID to maintain consistent order for ring connections
    activeNodes.sort((a, b) => a.id - b.id);

    rebuildConnections(); // Rebuild connections
    
    updateNodeSelects();
    updateNodeList();
    drawNetwork();
    updateRingStatus();
    updateStatus(`PC ${nodeToRecover.ip} recovered and added back to the ring.`, 'success');
    addLogEntry(`PC ${nodeToRecover.ip} recovered and added back to the ring`, 'success');
    updateNetworkStats();
    realignTokenPosition(); // Realign token after node recovered
}

// New helper function to rebuild connections for active nodes
function rebuildConnections() {
    const oldConnectionsMap = new Map();
    connections.forEach(conn => {
        // Create a unique key for the connection using sorted node IDs to handle both directions
        const key = [allNodes[conn.from].id, allNodes[conn.to].id].sort().join('-');
        oldConnectionsMap.set(key, conn.isActive);
    });

    connections.length = 0; // Clear existing connections
    if (activeNodes.length >= 2) {
        for (let i = 0; i < activeNodes.length; i++) {
            const fromNode = activeNodes[i];
            const toNode = activeNodes[(i + 1) % activeNodes.length];

            const fromNodeIndex = allNodes.indexOf(fromNode); // Get index in allNodes
            const toNodeIndex = allNodes.indexOf(toNode);     // Get index in allNodes

            // Create a unique key for the new connection
            const newConnectionKey = [fromNode.id, toNode.id].sort().join('-');

            // Always set new connections to active when rebuilding
            connections.push({
                from: fromNodeIndex,
                to: toNodeIndex,
                isActive: true  // Always set to true when rebuilding
            });
        }
    }
}

function updateNodeSelects() {
    const sourceSelect = document.getElementById('sourceNode');
    const destSelect = document.getElementById('destNode');
    sourceSelect.innerHTML = '';
    destSelect.innerHTML = '';
    
    activeNodes.forEach((node, index) => { // Iterate activeNodes
        if (node.isOn) {
            const option = document.createElement('option');
            option.value = node.ip;
            option.text = node.ip;
            sourceSelect.appendChild(option.cloneNode(true));
            destSelect.appendChild(option);
        }
    });
}

function updateNodeList() {
    const nodeListContainer = document.getElementById('nodeList');
    nodeListContainer.innerHTML = '';
    
    // Display active nodes
    activeNodes.forEach((node) => {
        const nodeItem = document.createElement('div');
        nodeItem.className = 'node-item';
        
        const nodeInfo = document.createElement('div');
        nodeInfo.innerHTML = `
            <div class="ip-address-text" style="color: #00d4ff; font-weight: bold;">${node.ip}</div>
            <div class="node-status ${node.isOn ? 'on' : 'off'}">${node.isOn ? 'ONLINE' : 'OFFLINE'}</div>
        `;
        
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.gap = '5px';
        
        const powerButton = document.createElement('button');
        powerButton.className = `power-button ${node.isOn ? 'power-on' : 'power-off'}`;
        powerButton.innerHTML = `<img src="images/${node.isOn ? 'on.png' : 'off.png'}" alt="${node.isOn ? 'ON' : 'OFF'}" class="power-icon">`;
        powerButton.onclick = () => toggleNode(node.id);
        
        const removeButton = document.createElement('button');
        removeButton.className = 'remove-button';
        removeButton.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
        removeButton.onclick = () => removeNode(node.id);
        
        buttonsContainer.appendChild(powerButton);
        buttonsContainer.appendChild(removeButton);
        
        nodeItem.appendChild(nodeInfo);
        nodeItem.appendChild(buttonsContainer);
        nodeListContainer.appendChild(nodeItem);
    });

    // Display removed nodes (if any) in a separate section or style them differently
    const removedPcs = allNodes.filter(node => node.status === 'removed');
    if (removedPcs.length > 0) {
        const removedHeader = document.createElement('h4');
        removedHeader.style.color = '#ffbf00';
        removedHeader.style.textAlign = 'center';
        removedHeader.style.marginTop = '20px';
        removedHeader.textContent = 'Removed PCs';
        nodeListContainer.appendChild(removedHeader);

        removedPcs.forEach(node => {
            const nodeItem = document.createElement('div');
            nodeItem.className = 'node-item';
            nodeItem.style.borderColor = '#ffbf00'; // Dimmed border for removed
            nodeItem.style.opacity = '0.7';

            const nodeInfo = document.createElement('div');
            nodeInfo.innerHTML = `
                <div class="ip-address-text" style="color: #ffbf00; font-weight: bold;">${node.ip}</div>
                <div class="node-status">REMOVED</div>
            `;
            
            const recoverButton = document.createElement('button');
            recoverButton.className = 'power-button'; // Reusing power-button class for styling
            recoverButton.style.borderColor = '#00d4ff';
            recoverButton.style.color = '#00d4ff';
            recoverButton.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.5-.88-.7-1.9-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.5.88.7 1.9.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z"/></svg>';
            recoverButton.onclick = () => recoverNode(node);
            
            nodeItem.appendChild(nodeInfo);
            nodeItem.appendChild(recoverButton);
            nodeListContainer.appendChild(nodeItem);
        });
    }
}

function toggleNode(id) { // Accept ID instead of index
    const nodeToToggle = allNodes.find(node => node.id === id);
    if (!nodeToToggle) return;

    nodeToToggle.isOn = !nodeToToggle.isOn;
    updateNodeSelects();
    updateNodeList();
    drawNetwork();
    updateRingStatus();
    const status = nodeToToggle.isOn ? 'ON' : 'OFF';
    updateStatus(`PC ${nodeToToggle.ip} is now ${status}`, 'success');
    addLogEntry(`PC ${nodeToToggle.ip} turned ${status}`, nodeToToggle.isOn ? 'success' : 'warning');
    updateNetworkStats();
}

function calculateNodePositions() {
    activeNodes.forEach((node, i) => {
        if (activeNodes.length === 1) {
            node.x = centerX;
            node.y = centerY;
            node.angle = 0;
        } else {
            const angle = (i / activeNodes.length) * 2 * Math.PI - Math.PI / 2;
            node.x = centerX + radius * Math.cos(angle);
            node.y = centerY + radius * Math.sin(angle);
            node.angle = angle;
        }
    });
}

function drawNetwork() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    calculateNodePositions();
    drawConnections();
    activeNodes.forEach((node, index) => drawNode(node, index));
    drawToken(); // Draw the token
}

function drawConnections() {
    const isRingIntact = activeNodes.every(node => node.isOn) && connections.every(conn => conn.isActive);

    connections.forEach(connection => {
        const fromNode = allNodes[connection.from];
        const toNode = allNodes[connection.to];

        if (!fromNode || !toNode || fromNode.status === 'removed' || toNode.status === 'removed') {
            return;
        }

        if (fromNode && toNode) {
            const startAngle = fromNode.angle;
            let endAngle = toNode.angle;
            if (endAngle < startAngle) endAngle += 2 * Math.PI;
            
            // Determine if the connection is truly broken
            const isTrulyBroken = !connection.isActive || !fromNode.isOn || !toNode.isOn;

            if (isRingIntact) {
                ctx.setLineDash([]);
                ctx.strokeStyle = '#FFA500'; // Orange for intact ring
                ctx.lineWidth = 6;
            } else if (isTrulyBroken) {
                ctx.setLineDash([8, 8]);
                ctx.strokeStyle = '#ff4545'; // Red for broken state
                ctx.lineWidth = 4;
            } else {
                ctx.setLineDash([8, 8]);
                ctx.strokeStyle = '#FFBF00'; 
                ctx.lineWidth = 4;
            }
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, startAngle, endAngle, false);
            ctx.stroke();
            
            if (isRingIntact || (connection.isActive && fromNode.isOn && toNode.isOn)) {
                const arrowAngle = endAngle - 0.1;
                const arrowX = centerX + radius * Math.cos(arrowAngle);
                const arrowY = centerY + radius * Math.sin(arrowAngle);
                drawArrow(arrowX, arrowY, toNode.x, toNode.y);
            }
        }
    });
}   

function drawArrow(fromX, fromY, toX, toY) {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const arrowLength = 18; // Increased for larger arrows
    const arrowAngle = Math.PI / 6;
    
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - arrowLength * Math.cos(angle - arrowAngle), toY - arrowLength * Math.sin(angle - arrowAngle));
    ctx.lineTo(toX - arrowLength * Math.cos(angle + arrowAngle), toY - arrowLength * Math.sin(angle + arrowAngle));
    ctx.closePath();
    ctx.fill();
}

function drawNode(node, index) {
    // Set glow effect based on node status
    if (node.isOn) {
        ctx.shadowColor = '#00d4ff';
        ctx.shadowBlur = 25;
    } else {
        ctx.shadowColor = '#ff4545';
        ctx.shadowBlur = 15;
    }
    
    // Draw PC image with glow
    if (pcImage) {
        ctx.drawImage(pcImage, node.x - nodeImageSize / 2, node.y - nodeImageSize / 2, nodeImageSize, nodeImageSize);
    }
    
    // Reset shadow for text
    ctx.shadowBlur = 0;
    
    // Draw IP address
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.ip, node.x, node.y + nodeRadius + 1);
}

function drawToken() {
    if (!token) return;
    
    ctx.shadowColor = token.isFree ? '#00ff00' : (token.isAck ? '#00d4ff' : '#ffbf00');
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(token.x, token.y, 10, 0, 2 * Math.PI);
    ctx.fillStyle = token.isFree ? '#00ff00' : (token.isAck ? '#00d4ff' : '#ffbf00');
    ctx.fill();
    ctx.strokeStyle = token.isFree ? '#00cc00' : (token.isAck ? '#00aacc' : '#ff8c00');
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Display token status or data
    if (!token.isFree) {
        ctx.fillStyle = '#000';
        ctx.font = 'bold 8px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const tokenText = token.isAck ? 'ACK' : (token.data ? 'DATA' : '');
        ctx.fillText(tokenText, token.x, token.y);
    }
}

function animateToken() {
    if (activeNodes.length < 2) {
        animationFrameId = requestAnimationFrame(animateToken);
        return; // Token cannot circulate with less than 2 nodes
    }

    const currentIndex = activeNodes.findIndex(node => node.id === token.currentActiveNodeId);
    if (currentIndex === -1) {
        console.warn('Token\'s current node not found in active nodes. Realigning.');
        realignTokenPosition();
        animationFrameId = requestAnimationFrame(animateToken);
        return;
    }

    let currentNode = activeNodes[currentIndex];
    let nextIndex;
    if (token.direction === 1) {
        nextIndex = (currentIndex + 1) % activeNodes.length;
    } else {
        nextIndex = (currentIndex - 1 + activeNodes.length) % activeNodes.length;
    }
    let nextNode = activeNodes[nextIndex];

    const connection = connections.find(c => 
        (allNodes.indexOf(currentNode) === c.from && allNodes.indexOf(nextNode) === c.to) ||
        (allNodes.indexOf(nextNode) === c.from && allNodes.indexOf(currentNode) === c.to)
    );

    if (!connection || !connection.isActive) {
        addLogEntry(`Token is waiting due to broken connection between ${currentNode.ip} and ${nextNode.ip}`, 'warning');
        animationFrameId = requestAnimationFrame(animateToken);
        return;
    }

    if (!currentNode.isOn) {
        addLogEntry(`Token is waiting: PC ${currentNode.ip} is offline`, 'warning');
        animationFrameId = requestAnimationFrame(animateToken);
        return;
    }

    if (!nextNode.isOn) {
        addLogEntry(`Token is waiting: PC ${nextNode.ip} is offline`, 'warning');
        animationFrameId = requestAnimationFrame(animateToken);
        return;
    }

    token.progress += token.speed;

    if (token.progress >= 1) {
        token.progress = 0;
        token.currentActiveNodeId = nextNode.id; // Update token's current node ID

        // Token handling logic when it arrives at a node
        if (!token.isFree) {
            if (token.isAck) {
                // Token is carrying acknowledgment back to source
                if (activeNodes.find(node => node.id === token.currentActiveNodeId)?.ip === token.destIP) { // destIP is original source
                    updateStatus(`Acknowledgement received by ${token.destIP}. Token is free.`, 'success');
                    addLogEntry(`Acknowledgement received by ${token.destIP}. Token is free.`, 'success');
                    acknowledgementsCount++; // Increment acknowledgements count
                    token.isFree = true;
                    token.isAck = false;
                    token.data = null;
                    token.sourceIP = null;
                    token.destIP = null;
                    token.direction = 1; // Reset direction for free circulation
                    updateNetworkStats();
                } else {
                    addLogEntry(`Acknowledgement forwarded by ${activeNodes.find(node => node.id === token.currentActiveNodeId)?.ip}`, 'info');
                }
            } else {
                // Token is carrying data to destination
                if (activeNodes.find(node => node.id === token.currentActiveNodeId)?.ip === token.destIP) {
                    updateStatus(`Data received by ${token.destIP} from ${token.sourceIP}. Sending acknowledgment.`, 'success');
                    addLogEntry(`Data received by ${token.destIP} from ${token.sourceIP}. Sending acknowledgment.`, 'success');
                    token.isAck = true;
                    // Swap source and destination for acknowledgment
                    const temp = token.sourceIP;
                    token.sourceIP = token.destIP;
                    token.destIP = temp;
                    token.direction = -1; // Reverse direction for ack
                } else {
                    addLogEntry(`Data token forwarded by ${activeNodes.find(node => node.id === token.currentActiveNodeId)?.ip}`, 'info');
                }
            }
        }

    } else {
        let startAngle = currentNode.angle;
        let endAngle = nextNode.angle;

        if (token.direction === -1) {
            startAngle = nextNode.angle;
            endAngle = currentNode.angle;
            if (endAngle > startAngle) startAngle -= 2 * Math.PI; // Adjust for reverse direction
        }
        
        if (endAngle < startAngle) endAngle += 2 * Math.PI; // Normalize for forward movement over 0/360

        const currentAngle = startAngle + token.progress * (endAngle - startAngle);
        token.x = centerX + radius * Math.cos(currentAngle);
        token.y = centerY + radius * Math.sin(currentAngle);
    }
    
    drawNetwork();
    animationFrameId = requestAnimationFrame(animateToken);
}

function sendPacket() {
    if (activeNodes.length < 2) {
        updateStatus('Need at least two PCs for token ring', 'error');
        addLogEntry('Failed to send data: Insufficient PCs', 'error');
        return;
    }

    const sourceIP = document.getElementById('sourceNode').value;
    const destIP = document.getElementById('destNode').value;
    
    const sourceNode = activeNodes.find(node => node.ip === sourceIP);
    const destNode = activeNodes.find(node => node.ip === destIP);

    if (!sourceNode || !destNode) {
        updateStatus('Please select valid source and destination nodes', 'error');
        addLogEntry('Failed to send data: Invalid node selection', 'error');
        return;
    }

    if (!sourceNode.isOn) {
        updateStatus(`Failed to send data: Source PC ${sourceNode.ip} is offline`, 'error');
        addLogEntry(`Failed to send data: Source PC ${sourceNode.ip} is offline`, 'error');
        return;
    }

    if (!destNode.isOn) {
        updateStatus(`Failed to send data: Destination PC ${destNode.ip} is offline`, 'error');
        addLogEntry(`Failed to send data: Destination PC ${destNode.ip} is offline`, 'error');
        return;
    }
    
    if (sourceIP === destIP) {
        updateStatus('Source and destination cannot be the same', 'warning');
        addLogEntry('Failed to send data: Source and destination are the same', 'warning');
        return;
    }

    // Check if the entire ring is intact before allowing data transmission
    if (!activeNodes.every(node => node.isOn) || !connections.every(conn => conn.isActive)) {
        updateStatus('Cannot send data: The ring is broken due to offline PCs or broken connections', 'error');
        addLogEntry('Failed to send data: Network ring is broken', 'error');
        return;
    }

    if (!token.isFree) {
        updateStatus('Token is currently busy. Please wait for it to become free.', 'warning');
        addLogEntry('Failed to send data: Token is busy', 'warning');
        return;
    }

    // Capture the token
    token.isFree = false;
    token.isAck = false;
    token.data = 'DATA'; // Example data, could be dynamic
    token.sourceIP = sourceIP;
    token.destIP = destIP;
    token.currentActiveNodeId = sourceNode.id; // Set ID of source node
    token.progress = 0;
    token.direction = 1; // Start forward for data transmission
    
    updateStatus(`Attempting to send data from ${sourceIP} to ${destIP}. Token captured.`, 'success');
    addLogEntry(`Token captured by ${sourceIP} to send data to ${destIP}`, 'success');
    dataTransmissionsCount++; // Increment data transmissions count
    updateNetworkStats();

    // Ensure token animation restarts if it was waiting
    cancelAnimationFrame(animationFrameId);
    animateToken();
}

function updateStatus(message, type = 'info') {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
    
    setTimeout(() => {
        statusElement.textContent = 'Status: Ready';
        statusElement.className = 'status';
    }, 3000);
}

function updateRingStatus() {
    const ringStatusElement = document.getElementById('ringStatus');
    let status = '';
    let type = '';
    
    if (activeNodes.length < 2) {
        status = 'Ring Status: Insufficient PCs';
        type = 'warning';
    } else if (activeNodes.every(node => node.isOn) && connections.every(conn => conn.isActive)) {
        status = 'Ring Status: Intact';
        type = 'success';
    } else {
        status = 'Ring Status: Broken';
        type = 'error';
    }
    
    if (ringStatusElement) {
        ringStatusElement.textContent = status;
        ringStatusElement.className = `ring-status ${type}`;
    }
    
    // Log ring status changes
    addLogEntry(status, type);
}

// FIXED: Get correct mouse coordinates relative to canvas
function getMousePos(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
        x: (evt.clientX - rect.left) * scaleX,
        y: (evt.clientY - rect.top) * scaleY
    };
}

// FIXED: Check if point is on arc connection
function isPointOnArc(clickX, clickY, connection, tolerance = 25) {
    const fromNode = allNodes[connection.from];
    const toNode = allNodes[connection.to];
    
    if (!fromNode || !toNode) return false;
    
    // Calculate distance from click point to center
    const distanceToCenter = Math.sqrt(
        Math.pow(clickX - centerX, 2) + Math.pow(clickY - centerY, 2)
    );
    
    // Check if click is near the ring radius
    if (Math.abs(distanceToCenter - radius) > tolerance) {
        return false;
    }
    
    // Calculate angle of click point
    let clickAngle = Math.atan2(clickY - centerY, clickX - centerX);
    if (clickAngle < 0) clickAngle += 2 * Math.PI;
    
    // Get connection angles
    let startAngle = fromNode.angle;
    let endAngle = toNode.angle;
    
    // Normalize angles to positive values
    if (startAngle < 0) startAngle += 2 * Math.PI;
    if (endAngle < 0) endAngle += 2 * Math.PI;
    
    // Handle wrap-around case
    if (endAngle < startAngle) {
        // Check if click is in the wrapped section
        return (clickAngle >= startAngle && clickAngle <= 2 * Math.PI) || 
               (clickAngle >= 0 && clickAngle <= endAngle);
    } else {
        // Normal case - check if click is between start and end angles
        return clickAngle >= startAngle && clickAngle <= endAngle;
    }
}

canvas.addEventListener('click', function(event) {
    const mousePos = getMousePos(canvas, event);
    const x = mousePos.x;
    const y = mousePos.y;
    
    let nodeClicked = false;
    
    activeNodes.forEach((node) => {
        const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
        if (distance < nodeRadius + 20) {
            toggleNode(node.id);
            nodeClicked = true;
        }
    });
    
    if (!nodeClicked) {
        connections.forEach(connection => {
            // Use allNodes to get correct node objects for connection check
            const fromNode = allNodes[connection.from];
            const toNode = allNodes[connection.to];

            // Only allow toggling connection if both connected nodes are active
            if (fromNode.status === 'active' && toNode.status === 'active' && isPointOnArc(x, y, connection)) {
                connection.isActive = !connection.isActive;
                const status = connection.isActive ? 'repaired' : 'broken';
                updateStatus(`Connection ${status} between ${fromNode.ip} and ${toNode.ip}`, 
                    connection.isActive ? 'success' : 'warning');
                addLogEntry(`Connection ${status} between ${fromNode.ip} and ${toNode.ip}`,
                    connection.isActive ? 'success' : 'warning');
                drawNetwork();
                updateRingStatus();
                updateNetworkStats();
                realignTokenPosition(); // Realign token if connection state changes
            }
        });
    }
});

function addLogEntry(message, type = 'info') {
    console.log('Adding log entry:', message, type); // Debug log
    const logContent = document.getElementById('activityLog');
    if (!logContent) {
        console.error('Activity log container not found!');
        return;
    }

    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    
    const timestamp = new Date().toLocaleTimeString();
    entry.innerHTML = `
        <div class="timestamp">[${timestamp}]</div>
        <div class="message">${message}</div>
    `;
    
    // Add new entry at the top
    logContent.insertBefore(entry, logContent.firstChild);
    
    // Limit the number of log entries
    while (logContent.children.length > MAX_LOG_ENTRIES) {
        logContent.removeChild(logContent.lastChild);
    }
}

function setupClearLog() {
    const clearButton = document.querySelector('.clear-log-btn');
    if (clearButton) {
        clearButton.addEventListener('click', () => {
            const logContent = document.getElementById('activityLog');
            if (logContent) {
                logContent.innerHTML = '';
                addLogEntry('Activity log cleared', 'warning');
            }
        });
    } else {
        console.error('Clear log button not found!'); // Debug log
    }
}

// New function to update network statistics
function updateNetworkStats() {
    const totalPcsElement = document.getElementById('totalPcs');
    const onlinePcsElement = document.getElementById('onlinePcs');
    const offlineActivePcsElement = document.getElementById('offlineActivePcs');
    const manuallyBrokenConnectionsElement = document.getElementById('manuallyBrokenConnections');
    const dataTransmissionsElement = document.getElementById('dataTransmissions');
    const acknowledgementsElement = document.getElementById('acknowledgements');
    const removedPcsElement = document.getElementById('removedPcs');
    const tokenStatusElement = document.getElementById('tokenStatus');

    if (totalPcsElement) {
        totalPcsElement.textContent = activeNodes.length;
    }

    const onlinePcs = activeNodes.filter(node => node.isOn).length;
    if (onlinePcsElement) {
        onlinePcsElement.textContent = onlinePcs;
    }

    const offlineActivePcs = activeNodes.filter(node => !node.isOn).length;
    if (offlineActivePcsElement) {
        offlineActivePcsElement.textContent = offlineActivePcs;
    }

    // Count manually broken connections
    let manuallyBrokenConnectionsCount = 0;
    connections.forEach(conn => {
        const fromNode = allNodes[conn.from];
        const toNode = allNodes[conn.to];
        // A connection is manually broken if it's inactive AND both connected PCs are online
        if (!conn.isActive && fromNode && toNode && fromNode.isOn && toNode.isOn) {
            manuallyBrokenConnectionsCount++;
        }
    });
    
    if (manuallyBrokenConnectionsElement) {
        manuallyBrokenConnectionsElement.textContent = manuallyBrokenConnectionsCount;
    }

    if (dataTransmissionsElement) {
        dataTransmissionsElement.textContent = dataTransmissionsCount;
    }

    if (acknowledgementsElement) {
        acknowledgementsElement.textContent = acknowledgementsCount;
    }

    const removedPcsCount = allNodes.filter(node => node.status === 'removed').length;
    if (removedPcsElement) {
        removedPcsElement.textContent = removedPcsCount;
    }

    if (tokenStatusElement) {
        let statusText = '';
        if (token.isFree) {
            statusText = 'Free';
        } else if (token.isAck) {
            statusText = `ACK (${token.sourceIP} -> ${token.destIP})`;
        } else {
            statusText = `DATA (${token.sourceIP} -> ${token.destIP})`;
        }
        tokenStatusElement.textContent = statusText;
    }
}

window.addEventListener('load', init);

// Modal Instructions Logic
window.addEventListener('DOMContentLoaded', () => {
    const instructionsButton = document.getElementById('instructionsButton');
    const instructionsModal = document.getElementById('instructionsModal');
    const closeButton = document.querySelector('#instructionsModal .close-button');

    if (instructionsButton && instructionsModal && closeButton) {
        // Open the modal
        instructionsButton.addEventListener('click', () => {
            instructionsModal.style.display = 'block';
            addLogEntry('Instructions modal opened', 'info');
        });

        // Close the modal when the close button is clicked
        closeButton.addEventListener('click', () => {
            instructionsModal.style.display = 'none';
            addLogEntry('Instructions modal closed', 'info');
        });

        // Close the modal when clicking outside of it
        window.addEventListener('click', (event) => {
            if (event.target === instructionsModal) {
                instructionsModal.style.display = 'none';
                addLogEntry('Instructions modal closed (clicked outside)', 'info');
            }
        });
    } else {
        console.error('Instructions button, modal, or close button not found!');
    }
});

// New helper function to realign token position after topology changes
function realignTokenPosition() {
    const currentTokenNodeInAllNodes = allNodes.find(node => node.id === token.currentActiveNodeId);
    const currentTokenNodeIsActive = currentTokenNodeInAllNodes && currentTokenNodeInAllNodes.status === 'active';

    let shouldHardReset = false; // Flag for full reset

    // Condition for hard reset: Token is busy AND its path is interrupted OR its target/source is invalid
    if (!token.isFree && (
        !currentTokenNodeIsActive || !activeNodes.includes(currentTokenNodeInAllNodes) || // If busy and current node becomes inactive/removed
        (token.sourceIP && !allNodes.find(node => node.ip === token.sourceIP)?.isOn) ||
        (token.destIP && !allNodes.find(node => node.ip === token.destIP)?.isOn) ||
        (token.sourceIP && allNodes.find(node => node.ip === token.sourceIP)?.status === 'removed') ||
        (token.destIP && allNodes.find(node => node.ip === token.destIP)?.status === 'removed')
    )) {
        shouldHardReset = true;
    }

    // Condition for token being on a removed node (even if free)
    if (!shouldHardReset && (!currentTokenNodeInAllNodes || !activeNodes.includes(currentTokenNodeInAllNodes))) {
        // Token was free or completed its task, but its node was removed.
        console.warn('Free token was on a removed node. Attempting to re-route to next active node.');
        
        let nextActiveNode = null;
        if (activeNodes.length > 0) {
            // Find the current node's original index in allNodes for sequential lookup
            const originalRemovedNodeIndex = allNodes.indexOf(currentTokenNodeInAllNodes);
            
            // Try to find the next active node in the sequence
            for (let i = 1; i <= allNodes.length; i++) { // Iterate through allNodes circularly
                const nextIndexInAllNodes = (originalRemovedNodeIndex + i) % allNodes.length;
                const potentialNextNode = allNodes[nextIndexInAllNodes];
                if (potentialNextNode && potentialNextNode.status === 'active') {
                    nextActiveNode = potentialNextNode;
                    break;
                }
            }
        }

        if (nextActiveNode) {
            token.currentActiveNodeId = nextActiveNode.id;
            token.x = nextActiveNode.x;
            token.y = nextActiveNode.y;
            token.progress = 0; // Reset progress to start from this node
            token.isFree = true; // Ensure it's free
            token.data = null; token.sourceIP = null; token.destIP = null; token.isAck = false; // Clear data
            token.direction = 1; // Reset direction
            console.log(`Free token re-routed to ${nextActiveNode.ip}`);
        } else if (activeNodes.length > 0) {
            // Fallback if no sequential next active node found (e.g., last node removed)
            token.currentActiveNodeId = activeNodes[0].id;
            token.x = activeNodes[0].x;
            token.y = activeNodes[0].y;
            token.progress = 0;
            token.isFree = true;
            token.data = null; token.sourceIP = null; token.destIP = null; token.isAck = false;
            token.direction = 1;
            console.log(`Free token re-routed to first active node ${activeNodes[0].ip}`);
        } else {
            // No active nodes left
            token.currentActiveNodeId = null;
            token.x = 0;
            token.y = 0;
            token.isFree = true;
            token.data = null; token.sourceIP = null; token.destIP = null; token.isAck = false;
            token.direction = 1;
            console.log('No active nodes left. Token reset and cleared.');
        }
    }
    
    if (shouldHardReset) {
        console.warn('Token busy, path broken or target/source invalid. Performing hard reset.');
        token.isFree = true;
        token.data = null;
        token.sourceIP = null;
        token.destIP = null;
        token.isAck = false;
        token.direction = 1;
        token.progress = 0;
        if (activeNodes.length > 0) {
            token.currentActiveNodeId = activeNodes[0].id;
            token.x = activeNodes[0].x;
            token.y = activeNodes[0].y;
        } else {
            token.currentActiveNodeId = null;
            token.x = 0;
            token.y = 0;
        }
    }
    updateNetworkStats();
    drawNetwork();
}

function breakAllConnections() {
    // Break all connections
    connections.forEach(conn => {
        conn.isActive = false;
    });
    
    // Update the display
    drawNetwork();
    updateRingStatus();
    updateStatus('All connections have been broken', 'warning');
    addLogEntry('All network connections have been broken', 'warning');
    updateNetworkStats();
    realignTokenPosition(); // Realign token since connections are broken
}

function restartConnections() {
    // Show restarting status
    updateStatus('Restarting all connections...', 'warning');
    addLogEntry('Restarting all network connections', 'warning');
    drawNetwork();
    
    // Add a small delay before actually restarting
    setTimeout(() => {
        // First turn all active PCs back online
        activeNodes.forEach(node => {
            if (!node.isOn) {
                node.isOn = true;
                addLogEntry(`PC ${node.ip} turned back online`, 'success');
            }
        });
        
        // Then rebuild connections to ensure proper ring structure
        rebuildConnections();
        
        // Then restore all connections
        connections.forEach(conn => {
            const fromNode = allNodes[conn.from];
            const toNode = allNodes[conn.to];
            // Only restore connection if both nodes are active
            if (fromNode && toNode && fromNode.status === 'active' && toNode.status === 'active') {
                conn.isActive = true;
            }
        });
        
        // Force a complete redraw of the network
        calculateNodePositions();
        drawNetwork();
        
        // Update ring status and ensure it reflects the new state
        const isRingIntact = activeNodes.every(node => node.isOn) && connections.every(conn => conn.isActive);
        if (isRingIntact) {
            updateRingStatus();
            updateStatus('All connections and PCs have been restored', 'success');
            addLogEntry('All network connections and PCs have been restored', 'success');
        } else {
            updateRingStatus();
            updateStatus('Some connections could not be restored', 'warning');
            addLogEntry('Some connections could not be restored - check PC status', 'warning');
        }
        
        updateNetworkStats();
        realignTokenPosition(); // Realign token since connections are restored
        
        // Force token animation to restart
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        animateToken();
    }, 500);
}