/**
 * Main Research Graph Visualizer
 * Static hierarchical visualization: Fields -> Keywords -> Research Questions
 */

class MainResearchGraph {
  constructor() {
    this.svg = null;
    this.nodes = [];
    this.links = [];
    this.width = 0;
    this.height = 0; // Will be set to viewport height
    
    this.init();
  }

  init() {
    this.setupContainer();
    this.createData();
    this.createStaticVisualization();
  }

  setupContainer() {
    const container = d3.select('#main-research-graph-container');
    if (container.empty()) return;

    // Use full viewport dimensions
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    
    this.svg = d3.select('#main-research-graph')
      .attr('width', this.width)
      .attr('height', this.height);
  }

  createData() {
    // Intersecting Fields (Top level - largest nodes)
    const fields = [
      { id: 'f1', label: 'Neuroscience', type: 'field', color: '#059669', level: 1 },
      { id: 'f2', label: 'Security', type: 'field', color: '#047857', level: 1 },
      { id: 'f3', label: 'Computational\nSimulation', type: 'field', color: '#065f46', level: 1 }
    ];

    // Keywords (Middle level - medium nodes)
    const keywords = [
      { id: 'k1', label: '#BrainSimulation', type: 'keyword', color: '#0891b2', level: 2 },
      { id: 'k2', label: '#FreeWill', type: 'keyword', color: '#0e7490', level: 2 },
      { id: 'k3', label: '#ComputationalNeuroscience', type: 'keyword', color: '#155e75', level: 2 },
      { id: 'k4', label: '#DecisionMaking', type: 'keyword', color: '#164e63', level: 2 },
      { id: 'k5', label: '#NeuralNetworks', type: 'keyword', color: '#083344', level: 2 },
      { id: 'k6', label: '#DigitalEthics', type: 'keyword', color: '#042f2e', level: 2 }
    ];

    // Research Questions (Bottom level - smaller nodes)
    const questions = [
      { id: 'q1', label: 'Human Free Will\nin Digital Age', type: 'question', color: '#2563eb', level: 3 },
      { id: 'q2', label: 'Decision\nPrediction', type: 'question', color: '#1e40af', level: 3 },
      { id: 'q3', label: 'Brain\nSimulation', type: 'question', color: '#1e3a8a', level: 3 },
      { id: 'q4', label: 'Neural\nAesthetics', type: 'question', color: '#1e293b', level: 3 }
    ];

    this.nodes = [...fields, ...keywords, ...questions];

    // Hierarchical connections: Fields -> Keywords -> Questions
    this.links = [
      // Fields to Keywords
      { source: 'f1', target: 'k3', strength: 0.9 }, // Neuroscience -> #ComputationalNeuroscience
      { source: 'f1', target: 'k4', strength: 0.8 }, // Neuroscience -> #DecisionMaking
      { source: 'f1', target: 'k5', strength: 0.7 }, // Neuroscience -> #NeuralNetworks
      { source: 'f2', target: 'k2', strength: 0.8 }, // Security -> #FreeWill
      { source: 'f2', target: 'k6', strength: 0.7 }, // Security -> #DigitalEthics
      { source: 'f3', target: 'k1', strength: 0.9 }, // Computational Simulation -> #BrainSimulation
      { source: 'f3', target: 'k5', strength: 0.6 }, // Computational Simulation -> #NeuralNetworks

      // Keywords to Questions
      { source: 'k2', target: 'q1', strength: 0.9 }, // #FreeWill -> Human Free Will
      { source: 'k6', target: 'q1', strength: 0.6 }, // #DigitalEthics -> Human Free Will
      { source: 'k4', target: 'q2', strength: 0.9 }, // #DecisionMaking -> Decision Prediction
      { source: 'k3', target: 'q2', strength: 0.7 }, // #ComputationalNeuroscience -> Decision Prediction
      { source: 'k1', target: 'q3', strength: 0.9 }, // #BrainSimulation -> Brain Simulation
      { source: 'k5', target: 'q3', strength: 0.7 }, // #NeuralNetworks -> Brain Simulation
      { source: 'k1', target: 'q4', strength: 0.6 }, // #BrainSimulation -> Neural Aesthetics
      { source: 'k5', target: 'q4', strength: 0.8 }, // #NeuralNetworks -> Neural Aesthetics

      // Some cross-level connections for complexity
      { source: 'f1', target: 'q2', strength: 0.5 }, // Neuroscience -> Decision Prediction
      { source: 'f3', target: 'q3', strength: 0.6 }, // Computational Simulation -> Brain Simulation
      { source: 'f2', target: 'q1', strength: 0.5 }  // Security -> Human Free Will
    ];

    // Calculate positions for static layout
    this.calculateStaticPositions();
  }

  calculateStaticPositions() {
    const levelHeight = this.height / 3.5; // More vertical spacing
    const centerX = this.width / 2;

    // Position Fields (top level)
    const fields = this.nodes.filter(n => n.type === 'field');
    const fieldSpacing = this.width / (fields.length + 1);
    fields.forEach((node, i) => {
      node.x = fieldSpacing * (i + 1);
      node.y = levelHeight * 0.8; // Start higher
      node.fx = node.x; // Fix position
      node.fy = node.y;
    });

    // Position Keywords (middle level)
    const keywords = this.nodes.filter(n => n.type === 'keyword');
    const keywordSpacing = this.width / (keywords.length + 1);
    keywords.forEach((node, i) => {
      node.x = keywordSpacing * (i + 1);
      node.y = levelHeight * 2.0; // More spread out
      node.fx = node.x;
      node.fy = node.y;
    });

    // Position Questions (bottom level)
    const questions = this.nodes.filter(n => n.type === 'question');
    const questionSpacing = this.width / (questions.length + 1);
    questions.forEach((node, i) => {
      node.x = questionSpacing * (i + 1);
      node.y = levelHeight * 3.2; // Lower position
      node.fx = node.x;
      node.fy = node.y;
    });
  }

  createStaticVisualization() {
    // Create links
    const link = this.svg.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(this.links)
      .enter().append('line')
      .attr('stroke', '#94a3b8')
      .attr('stroke-opacity', d => d.strength * 0.6)
      .attr('stroke-width', d => Math.sqrt(d.strength) * 2)
      .attr('x1', d => this.getNodeById(d.source).x)
      .attr('y1', d => this.getNodeById(d.source).y)
      .attr('x2', d => this.getNodeById(d.target).x)
      .attr('y2', d => this.getNodeById(d.target).y);

    // Create nodes
    const node = this.svg.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(this.nodes)
      .enter().append('g')
      .attr('class', d => `node node-${d.type}`)
      .attr('transform', d => `translate(${d.x},${d.y})`);

    // Add rectangles for nodes (sharp design)
    node.append('rect')
      .attr('width', d => {
        if (d.type === 'field') return 90;      // Largest (top level)
        if (d.type === 'keyword') return 70;    // Medium (middle level)
        return 56;                              // Smallest (bottom level)
      })
      .attr('height', d => {
        if (d.type === 'field') return 90;      // Largest (top level)
        if (d.type === 'keyword') return 70;    // Medium (middle level)
        return 56;                              // Smallest (bottom level)
      })
      .attr('x', d => {
        if (d.type === 'field') return -45;     // Center the rectangle
        if (d.type === 'keyword') return -35;
        return -28;
      })
      .attr('y', d => {
        if (d.type === 'field') return -45;     // Center the rectangle
        if (d.type === 'keyword') return -35;
        return -28;
      })
      .attr('fill', d => d.color)
      .attr('stroke', 'none')
      .style('filter', 'drop-shadow(0 3px 6px rgba(0,0,0,0.15))');

    // Add labels
    node.append('text')
      .text(d => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('font-family', 'Inter, sans-serif')
      .style('font-size', d => {
        if (d.type === 'field') return '12px';
        if (d.type === 'keyword') return '10px';
        return '9px';
      })
      .style('font-weight', d => {
        if (d.type === 'field') return '700';
        if (d.type === 'keyword') return '600';
        return '600';
      })
      .style('fill', '#ffffff')
      .style('text-shadow', '0 1px 3px rgba(0,0,0,0.4)')
      .style('pointer-events', 'none')
      .each(function(d) {
        // Handle multi-line text
        if (d.label.includes('\n')) {
          const lines = d.label.split('\n');
          d3.select(this).text('');
          lines.forEach((line, i) => {
            d3.select(this).append('tspan')
              .text(line)
              .attr('x', 0)
              .attr('dy', i === 0 ? '0em' : '1.1em');
          });
        }
      });

    // Add hover effects for better interactivity
    node
      .on('mouseover', this.handleMouseOver.bind(this))
      .on('mouseout', this.handleMouseOut.bind(this));
  }

  handleMouseOver(event, d) {
    // Highlight connected nodes and links
    const connectedNodeIds = new Set();
    connectedNodeIds.add(d.id);

    this.links.forEach(link => {
      if (link.source === d.id || link.target === d.id) {
        connectedNodeIds.add(link.source);
        connectedNodeIds.add(link.target);
      }
    });

    d3.selectAll('.node')
      .style('opacity', node => connectedNodeIds.has(node.id) ? 1 : 0.3);

    d3.selectAll('.links line')
      .attr('stroke-opacity', link => {
        return (link.source === d.id || link.target === d.id) ? 0.9 : 0.1;
      })
      .attr('stroke-width', link => {
        return (link.source === d.id || link.target === d.id) 
          ? Math.sqrt(link.strength) * 4 
          : Math.sqrt(link.strength) * 2;
      });
  }

  handleMouseOut(event, d) {
    // Return to normal state
    d3.selectAll('.node').style('opacity', 1);
    d3.selectAll('.links line')
      .attr('stroke-opacity', d => d.strength * 0.6)
      .attr('stroke-width', d => Math.sqrt(d.strength) * 2);
  }

  getNodeById(id) {
    return this.nodes.find(node => node.id === id);
  }

  // Resize handler
  resize() {
    const container = d3.select('#main-research-graph-container');
    if (container.empty()) return;

    // Use full viewport dimensions
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    
    this.svg.attr('width', this.width).attr('height', this.height);
    
    // Recalculate positions for new dimensions
    this.calculateStaticPositions();
    
    // Update node positions
    d3.selectAll('.node')
      .attr('transform', d => `translate(${d.x},${d.y})`);
    
    // Update link positions
    d3.selectAll('.links line')
      .attr('x1', d => this.getNodeById(d.source).x)
      .attr('y1', d => this.getNodeById(d.source).y)
      .attr('x2', d => this.getNodeById(d.target).x)
      .attr('y2', d => this.getNodeById(d.target).y);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('main-research-graph-container')) {
    // Small delay to ensure container is properly sized
    setTimeout(() => {
      window.mainResearchGraph = new MainResearchGraph();
      
      // Handle window resize
      window.addEventListener('resize', () => {
        if (window.mainResearchGraph) {
          window.mainResearchGraph.resize();
        }
      });
    }, 100);
  }
});
