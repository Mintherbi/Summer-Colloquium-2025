class ConnectomeVisualizer {
    constructor() {
        this.svg = null;
        this.g = null;
        this.simulation = null;
        this.nodes = [];
        this.edges = [];
        this.neuronPositions = new Map();
        this.zoom = null;
        this.showLabels = true;
        
        // Color mapping for neurotransmitters
        this.neurotransmitterColors = {
            'exc': '#ff0000',     // Red for excitatory
            'inh': '#0000ff',     // Blue for inhibitory
            'ach': '#00ff00',     // Green for acetylcholine
            'gaba': '#ffff00',    // Yellow for GABA
            'glu': '#ff00ff',     // Magenta for glutamate
            'da': '#00ffff',      // Cyan for dopamine
            'ser': '#ffa500',     // Orange for serotonin
            'default': '#ffffff'  // White for unknown
        };
        
        this.init();
    }
    
    async init() {
        this.showLoading();
        await this.loadData();
        this.setupSVG();
        this.setupControls();
        this.createVisualization();
        this.hideLoading();
    }
    
    showLoading() {
        const loading = document.createElement('div');
        loading.className = 'loading';
        loading.innerHTML = `
            <div class="spinner"></div>
            <div>Loading C. elegans Connectome...</div>
        `;
        document.body.appendChild(loading);
    }
    
    hideLoading() {
        const loading = document.querySelector('.loading');
        if (loading) {
            loading.remove();
        }
    }
    
    async loadData() {
        try {
            // Load connectome data
            const connectomeData = await d3.csv('src/csv/CElegansTP-master/Connectome.csv');
            
            // Load spatial positions (if available)
            let positionData = [];
            try {
                positionData = await d3.csv('src/csv/CElegansTP-master/spatialpositions/distances.csv');
            } catch (e) {
                console.log('Spatial position data not found, using random positions');
            }
            
            // Process spatial positions
            positionData.forEach(d => {
                if (d[''] && d['0'] && d['1'] && d['2']) {
                    this.neuronPositions.set(d[''], {
                        x: +d['0'],
                        y: +d['1'],
                        z: +d['2'],
                        name: d['']
                    });
                }
            });
            
            // Create nodes from unique neurons
            const neuronSet = new Set();
            connectomeData.forEach(d => {
                if (d.Neuron) neuronSet.add(d.Neuron);
                if (d.Target) neuronSet.add(d.Target);
            });
            
            this.nodes = Array.from(neuronSet).map(neuron => {
                const position = this.neuronPositions.get(neuron);
                return {
                    id: neuron,
                    name: neuron,
                    x: position ? position.x * 2 : Math.random() * 800,
                    y: position ? position.y * 2 : Math.random() * 600,  // Restored original height
                    z: position ? position.z * 2 : 0,
                    connections: 0
                };
            });
            
            // Create edges from connectome data
            this.edges = connectomeData
                .filter(d => d.Neuron && d.Target && d['Number of Connections'] && d.Neurotransmitter)
                .map(d => ({
                    source: d.Neuron,
                    target: d.Target,
                    strength: +d['Number of Connections'],
                    neurotransmitter: d.Neurotransmitter.toLowerCase().trim(),
                    color: this.neurotransmitterColors[d.Neurotransmitter.toLowerCase().trim()] || this.neurotransmitterColors.default
                }));
            
            // Count connections for each node
            this.edges.forEach(edge => {
                const sourceNode = this.nodes.find(n => n.id === edge.source);
                const targetNode = this.nodes.find(n => n.id === edge.target);
                if (sourceNode) sourceNode.connections++;
                if (targetNode) targetNode.connections++;
            });
            
            console.log(`Loaded ${this.nodes.length} neurons and ${this.edges.length} connections`);
            
        } catch (error) {
            console.error('Error loading data:', error);
            alert('데이터를 불러오는 중 오류가 발생했습니다.');
        }
    }
    
    setupSVG() {
        // Use full viewport dimensions
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.svg = d3.select('#network-svg-methodology')
            .attr('width', width)
            .attr('height', height)
            .style('background', '#000000');
        
        // Store dimensions for later use
        this.width = width;
        this.height = height;
        
        // 기존 내용을 모두 지움 (중복 방지)
        this.svg.selectAll('*').remove();
        
        // Add arrow markers
        this.svg.append('defs').append('marker')
            .attr('id', 'arrowhead')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 15)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('class', 'arrowhead')
            .style('fill', '#999');
        
        // Create main group for zooming
        this.g = this.svg.append('g');
        
        // Setup zoom behavior
        this.zoom = d3.zoom()
            .scaleExtent([0.1, 10])
            .on('zoom', (event) => {
                this.g.attr('transform', event.transform);
            });
        
        this.svg.call(this.zoom);
    }
    
    setupControls() {
        // Neurotransmitter filter (if exists)
        const neurotransmitterFilter = d3.select('#neurotransmitter-filter');
        if (!neurotransmitterFilter.empty()) {
            neurotransmitterFilter.on('change', () => {
                this.updateVisualization();
            });
        }
        
        // Connection strength filter (if exists)
        const connectionStrength = d3.select('#connection-strength');
        if (!connectionStrength.empty()) {
            connectionStrength.on('input', (event) => {
                const strengthValue = d3.select('#strength-value');
                if (!strengthValue.empty()) {
                    strengthValue.text(event.target.value);
                }
                this.updateVisualization();
            });
        }
        
        // Reset camera (if exists)
        const resetCamera = d3.select('#reset-camera');
        if (!resetCamera.empty()) {
            resetCamera.on('click', () => {
                this.resetCamera();
            });
        }
        
        // Toggle labels (if exists)
        const toggleLabels = d3.select('#toggle-labels');
        if (!toggleLabels.empty()) {
            toggleLabels.on('click', () => {
                this.showLabels = !this.showLabels;
                this.updateLabels();
            });
        }
        
        // New controls for the methodology connectome
        const repulsionStrength = d3.select('#repulsion-strength');
        if (!repulsionStrength.empty()) {
            repulsionStrength.on('input', (event) => {
                const strength = +event.target.value;
                d3.select('#repulsion-value').text(strength);
                if (this.simulation) {
                    this.simulation.force('charge').strength(strength);
                    this.simulation.alpha(0.3).restart();
                }
            });
        }

        const linkDistance = d3.select('#link-distance');
        if (!linkDistance.empty()) {
            linkDistance.on('input', (event) => {
                const distance = +event.target.value;
                d3.select('#link-distance-value').text(distance);
                if (this.simulation) {
                    this.simulation.force('link').distance(distance);
                    this.simulation.alpha(0.3).restart();
                }
            });
        }

        const resetSimulationButton = d3.select('#reset-simulation-button');
        if (!resetSimulationButton.empty()) {
            resetSimulationButton.on('click', () => {
                // Reset to initial values
                const initialRepulsion = -300;
                const initialDistance = 50;
                const initialStrength = 1;

                d3.select('#repulsion-strength').property('value', initialRepulsion);
                d3.select('#repulsion-value').text(initialRepulsion);
                d3.select('#link-distance').property('value', initialDistance);
                d3.select('#link-distance-value').text(initialDistance);
                d3.select('#connection-strength').property('value', initialStrength);
                d3.select('#strength-value').text(initialStrength);

                if (this.simulation) {
                    this.simulation.force('charge').strength(initialRepulsion);
                    this.simulation.force('link').distance(initialDistance);
                    this.simulation.alpha(1).restart(); // Strong restart
                }
                
                // Update visualization with new filter values
                this.updateVisualization();
            });
        }
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }
    
    createVisualization() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Initial values from the sliders
        const initialRepulsion = d3.select('#repulsion-strength').node() ? +d3.select('#repulsion-strength').node().value : -300;
        const initialDistance = d3.select('#link-distance').node() ? +d3.select('#link-distance').node().value : 50;

        // Create force simulation
        this.simulation = d3.forceSimulation(this.nodes)
            .force('link', d3.forceLink(this.edges).id(d => d.id).distance(initialDistance))
            .force('charge', d3.forceManyBody().strength(initialRepulsion))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(15));
        
        this.updateVisualization();
    }
    
    updateVisualization() {
        // Get filter values (with safe checks)
        const neurotransmitterFilterElement = d3.select('#neurotransmitter-filter').node();
        const connectionStrengthElement = d3.select('#connection-strength').node();
        
        const neurotransmitterFilter = neurotransmitterFilterElement ? neurotransmitterFilterElement.value : 'all';
        const minStrength = connectionStrengthElement ? +connectionStrengthElement.value : 0;
        
        // Filter edges
        let filteredEdges = this.edges.filter(edge => {
            const strengthOk = edge.strength >= minStrength;
            const neurotransmitterOk = neurotransmitterFilter === 'all' || 
                                      edge.neurotransmitter === neurotransmitterFilter;
            return strengthOk && neurotransmitterOk;
        });
        
        // Get nodes that are connected by filtered edges
        const connectedNodeIds = new Set();
        filteredEdges.forEach(edge => {
            connectedNodeIds.add(edge.source.id || edge.source);
            connectedNodeIds.add(edge.target.id || edge.target);
        });
        
        const filteredNodes = this.nodes.filter(node => connectedNodeIds.has(node.id));
        
        // Update simulation
        this.simulation.nodes(filteredNodes);
        this.simulation.force('link').links(filteredEdges);
        
        // Draw edges
        const link = this.g.selectAll('.edge')
            .data(filteredEdges, d => `${d.source.id || d.source}-${d.target.id || d.target}`);
        
        link.exit().remove();
        
        link.enter().append('line')
            .attr('class', 'edge')
            .style('stroke', d => d.color)
            .style('stroke-width', d => Math.max(1, Math.sqrt(d.strength)))
            .merge(link)
            .style('stroke', d => d.color)
            .style('stroke-width', d => Math.max(1, Math.sqrt(d.strength)));
        
        // Draw nodes
        const node = this.g.selectAll('.node')
            .data(filteredNodes, d => d.id);
        
        node.exit().remove();
        
        const nodeEnter = node.enter().append('circle')
            .attr('class', 'node')
            .attr('r', d => Math.max(5, Math.sqrt(d.connections) * 2))
            .style('fill', d => {
                // Color based on most common neurotransmitter
                const outgoingEdges = filteredEdges.filter(e => 
                    (e.source.id || e.source) === d.id);
                if (outgoingEdges.length > 0) {
                    const neurotransmitterCounts = {};
                    outgoingEdges.forEach(e => {
                        neurotransmitterCounts[e.neurotransmitter] = 
                            (neurotransmitterCounts[e.neurotransmitter] || 0) + 1;
                    });
                    const mostCommon = Object.keys(neurotransmitterCounts)
                        .reduce((a, b) => neurotransmitterCounts[a] > neurotransmitterCounts[b] ? a : b);
                    return this.neurotransmitterColors[mostCommon] || this.neurotransmitterColors.default;
                }
                return this.neurotransmitterColors.default;
            })
            .call(this.drag())
            .on('click', (event, d) => this.selectNode(d))
            .on('mouseover', (event, d) => this.showTooltip(event, d))
            .on('mouseout', () => this.hideTooltip());
        
        // Add labels
        const label = this.g.selectAll('.node-label')
            .data(filteredNodes, d => d.id);
        
        label.exit().remove();
        
        label.enter().append('text')
            .attr('class', 'node-label')
            .text(d => d.name)
            .style('display', this.showLabels ? 'block' : 'none')
            .style('fill', '#ffffff')
            .style('font-size', '10px')
            .style('font-family', 'Arial, sans-serif')
            .style('text-anchor', 'middle')
            .style('pointer-events', 'none')
            .merge(label)
            .style('display', this.showLabels ? 'block' : 'none')
            .style('fill', '#ffffff');
        
        // Update simulation
        this.simulation.alpha(0.3).restart();
        
        // Update positions on tick
        this.simulation.on('tick', () => {
            this.g.selectAll('.edge')
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
            
            this.g.selectAll('.node')
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);
            
            this.g.selectAll('.node-label')
                .attr('x', d => d.x)
                .attr('y', d => d.y + 20);
        });
    }
    
    drag() {
        return d3.drag()
            .on('start', (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on('drag', (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on('end', (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0);
                // Do not nullify fx, fy to keep the node in place after dragging
                // d.fx = null;
                // d.fy = null;
            });
    }
    
    selectNode(node) {
        // Remove previous selection
        this.g.selectAll('.node').classed('selected', false);
        
        // Add selection to clicked node
        this.g.selectAll('.node')
            .filter(d => d.id === node.id)
            .classed('selected', true);
        
        // Update node info panel
        const outgoingConnections = this.edges.filter(e => 
            (e.source.id || e.source) === node.id);
        const incomingConnections = this.edges.filter(e => 
            (e.target.id || e.target) === node.id);
        
        const position = this.neuronPositions.get(node.id);
        
        let details = `
            <strong>Neuron:</strong> ${node.name}<br>
            <strong>Outgoing connections:</strong> ${outgoingConnections.length}<br>
            <strong>Incoming connections:</strong> ${incomingConnections.length}<br>
        `;
        
        if (position) {
            details += `
                <strong>Position:</strong><br>
                X: ${position.x.toFixed(2)}<br>
                Y: ${position.y.toFixed(2)}<br>
                Z: ${position.z.toFixed(2)}<br>
            `;
        }
        
        if (outgoingConnections.length > 0) {
            const neurotransmitters = [...new Set(outgoingConnections.map(c => c.neurotransmitter))];
            details += `<strong>Neurotransmitters:</strong> ${neurotransmitters.join(', ')}<br>`;
        }
        
        // Update node details panel (if exists)
        const nodeDetailsElement = d3.select('#node-details');
        if (!nodeDetailsElement.empty()) {
            nodeDetailsElement.html(details);
        }
    }
    
    showTooltip(event, node) {
        const tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip')
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px')
            .html(`
                <strong>${node.name}</strong><br>
                Connections: ${node.connections}<br>
                Click for details. Drag to position.
            `);
    }
    
    hideTooltip() {
        d3.selectAll('.tooltip').remove();
    }
    
    updateLabels() {
        this.g.selectAll('.node-label')
            .style('display', this.showLabels ? 'block' : 'none');
    }
    
    resetCamera() {
        this.svg.transition()
            .duration(750)
            .call(this.zoom.transform, d3.zoomIdentity);
    }
    
    handleResize() {
        // Update dimensions for full viewport
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.svg
            .attr('width', width)
            .attr('height', height);
            
        this.width = width;
        this.height = height;
        
        // Update force simulation center
        if (this.simulation) {
            this.simulation.force('center', d3.forceCenter(width / 2, height / 2));
            this.simulation.alpha(0.3).restart();
        }
    }
}

// Global function to create connectome visualization
function createConnectomeVisualization(containerId) {
    // Create SVG element in the specified container
    const container = d3.select(`#${containerId}`);
    container.selectAll('*').remove(); // Clear existing content
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    const svg = container.append('svg')
        .attr('id', 'network-svg')
        .attr('width', width)
        .attr('height', height)
        .style('background', '#000000');
    
    // Initialize the visualizer
    new ConnectomeVisualizer();
}

// Auto-initialization removed - will be called manually from HTML
