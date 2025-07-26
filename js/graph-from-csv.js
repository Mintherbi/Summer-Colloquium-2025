// ============================================================================
// CSV-Based Network Graph with D3.js
// This script creates an interactive network graph that loads data from CSV files
// ============================================================================

// Define the main function that contains all graph logic
var graphSketch3 = function() {
  
  // Set the size of our visualization area
  const width = 800;   // Width of the SVG canvas in pixels
  const height = 400;  // Height of the SVG canvas in pixels

  // Load both CSV files and create the graph when both are loaded
  // Promise.all() waits for both files to load before continuing
  Promise.all([
    d3.csv('nodes.csv'),  // Load the nodes data from CSV file
    d3.csv('edges.csv')   // Load the edges data from CSV file
  ]).then(function([nodesData, edgesData]) {
    // This code runs after both CSV files are successfully loaded
    console.log('Loaded nodes:', nodesData);  // Show the loaded nodes in browser console
    console.log('Loaded edges:', edgesData);  // Show the loaded edges in browser console

    // Process the nodes data - convert string values to appropriate types
    const nodes = nodesData.map(d => ({
      id: d.id,                    // Keep the ID as a string
      name: d.name,                // Keep the name as a string
      role: d.role,                // Keep the role as a string
      age: +d.age,                 // Convert age to number (the + converts string to number)
      department: d.department,    // Keep the department as a string
      friends: +d.friends,         // Convert friends count to number
      size: +d.size,               // Convert size to number
      color: d.color               // Keep the color as a string
    }));

    // Process the edges data - convert string values to appropriate types
    const links = edgesData.map(d => ({
      source: d.source,            // Keep the source node ID as a string
      target: d.target,            // Keep the target node ID as a string
      relationship: d.relationship, // Keep the relationship type as a string
      course: d.course || '',      // Keep course name, or empty string if missing
      since: d.since ? +d.since : null,  // Convert year to number, or null if missing
      strength: +d.strength,       // Convert strength to number
      type: d.type,                // Keep the type as a string
      department: d.department || ''  // Keep department, or empty string if missing
    }));

    // Create the graph with the processed data
    createGraph(nodes, links);
  }).catch(function(error) {
    // This code runs if there's an error loading the CSV files
    console.error('Error loading CSV files:', error);  // Show error in browser console
    
    // Create a fallback graph with sample data if CSV loading fails
    const fallbackNodes = [
      { id: 'Error', name: 'CSV Load Error', role: 'error', age: 0, department: 'Error', friends: 0, size: 20, color: '#ff0000' }
    ];
    const fallbackLinks = [];
    createGraph(fallbackNodes, fallbackLinks);
  });

  // ============================================================================
  // GRAPH CREATION FUNCTION
  // This function creates the actual visual network graph
  // ============================================================================

  function createGraph(nodes, links) {
    // Clear any existing content in the container
    d3.select('#d3-container-2').selectAll('*').remove();

    // Create the main SVG container for our graph
    const svg = d3.select('#d3-container-2')  // Select the HTML element with id 'd3-container-2'
      .append('svg')                           // Create a new SVG element inside that container
      .attr('width', width)                    // Set the width of the SVG
      .attr('height', height)                  // Set the height of the SVG
      .style('background', '#f0f0f0');        // Set a light gray background color

    // Create a group that will contain all graph elements and can be transformed (for zoom/pan)
    const g = svg.append('g');

    // Add arrow marker for directed edges - this creates the arrow shape that appears at the end of directed links
    g.append('defs').append('marker')  // Create a marker definition in the SVG defs section
      .attr('id', 'arrowhead-3')       // Give the marker a unique ID so we can reference it later
      .attr('viewBox', '-0 -5 10 10')  // Define the coordinate system for the marker
      .attr('refX', 50)                // X position where the arrow should be placed relative to the end of the line
      .attr('refY', 0)                 // Y position where the arrow should be placed (centered)
      .attr('orient', 'auto')          // Automatically orient the arrow to follow the line direction
      .attr('markerWidth', 4)          // Width of the arrow marker
      .attr('markerHeight', 4)         // Height of the arrow marker
      .append('path')                  // Create the actual arrow shape using a path element
      .attr('d', 'M 0,-4 L 8,0 L 0,4')  // Path data: creates a triangle shape for the arrow
      .attr('fill', '#666');           // Fill color of the arrow (dark gray)

    // ============================================================================
    // ZOOM BEHAVIOR SETUP
    // ============================================================================

    // Create zoom behavior with constraints
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])         // Limit zoom scale between 0.1x and 4x
      .on('zoom', (event) => {
        // Apply the zoom transformation to the main group
        g.attr('transform', event.transform);
      });

    // Apply zoom behavior to the SVG
    svg.call(zoom);

    // Add zoom controls info text
    svg.append('text')
      .attr('x', 10)                  // X position of the text
      .attr('y', 20)                  // Y position of the text
      .attr('font-size', '12px')      // Font size of the text
      .attr('fill', '#666')           // Color of the text
      .text('Use mouse wheel to zoom, drag to pan');  // The text content

    // ============================================================================
    // FORCE SIMULATION SETUP
    // This creates the physics simulation that positions the nodes automatically
    // ============================================================================

    // Create the force simulation that will position the nodes automatically
    const simulation = d3.forceSimulation(nodes)  // Create a new force simulation with our nodes
      .force('link', d3.forceLink(links)         // Add a force that pulls connected nodes together
        .id(d => d.id)                            // Tell D3 how to identify each node (using the id property)
        .distance(d => {                          // Set the ideal distance between connected nodes
          // Different distances based on relationship type
          switch(d.relationship) {
            case 'friends': return 80;            // Friends are closer together
            case 'colleagues': return 100;        // Colleagues are medium distance
            case 'student-teacher': return 120;   // Student-teacher pairs are further apart
            default: return 100;                  // Default distance for unknown relationships
          }
        }))
      .force('charge', d3.forceManyBody()        // Add a force that makes nodes repel each other
        .strength(d => d.role === 'professor' ? -400 : -200))  // Professors repel more than students
      .force('center', d3.forceCenter(width / 2, height / 2))  // Add a force that pulls all nodes toward the center
      .force('collision', d3.forceCollide().radius(d => d.size + 5));  // Add a force that prevents nodes from overlapping

    // ============================================================================
    // CREATE VISUAL ELEMENTS
    // ============================================================================

    // Create the visual links (lines) between nodes
    const link = g.append('g')        // Create a group to hold all the link elements
      .attr('stroke', '#888')         // Set default stroke color for links
      .attr('stroke-width', 2)        // Set uniform stroke width
      .selectAll('line')              // Select all line elements (none exist yet)
      .data(links)                    // Bind our links data to the selection
      .enter().append('line')         // Create a new line element for each link
      .attr('marker-end', d => d.type === 'directed' ? 'url(#arrowhead-3)' : null);  // Add arrow only to directed relationships

    // Create the visual nodes (circles) representing people
    const node = g.append('g')        // Create a group to hold all the node elements
      .attr('stroke', '#fff')         // Set the border color of nodes to white
      .attr('stroke-width', 2)        // Set the border thickness of nodes
      .selectAll('circle')            // Select all circle elements (none exist yet)
      .data(nodes)                    // Bind our nodes data to the selection
      .enter().append('circle')       // Create a new circle element for each node
      .attr('r', d => d.size || 20)  // Use size from CSV or default to 20
      .attr('fill', d => d.color || '#3264a8')  // Use color from CSV or default to blue
      .call(drag(simulation));        // Add drag behavior to the nodes so users can move them around

    // ============================================================================
    // INTERACTIVE BEHAVIORS
    // ============================================================================

    // Add hover effects to make the graph interactive
    node.on('mouseover', function(event, d) {  // When mouse hovers over a node
      // Highlight connected links by making them more opaque
      link.style('stroke-opacity', l => 
        l.source.id === d.id || l.target.id === d.id ? 1 : 0.1  // Full opacity for connected links, low opacity for others
      );
      
      // Show tooltip with node information
      showTooltip(event, d);
    })
    .on('mouseout', function(event, d) {  // When mouse leaves a node
      // Reset link opacity back to normal
      link.style('stroke-opacity', 0.6);
      
      // Hide tooltip
      hideTooltip();
    })
    .on('click', function(event, d) {  // When node is clicked
      console.log('Clicked on:', d.name, 'Role:', d.role, 'Department:', d.department);  // Log node info to console
    });

    // Create text labels for each node showing the person's name
    const label = g.append('g')       // Create a group to hold all the label elements
      .selectAll('text')              // Select all text elements (none exist yet)
      .data(nodes)                    // Bind our nodes data to the selection
      .enter().append('text')         // Create a new text element for each node
      .attr('text-anchor', 'middle')  // Center the text horizontally on the node
      .attr('dy', '.35em')            // Adjust vertical position to center text on the node
      .attr('font-size', 16)          // Set the font size of the labels
      .attr('fill', '#fff')           // Set the text color to white
      .text(d => d.id);               // Set the text content to the node ID

    // ============================================================================
    // TOOLTIP FUNCTIONALITY
    // ============================================================================

    // Create tooltip div that will show detailed information when hovering over nodes
    const tooltip = d3.select('body').append('div')  // Create a new div element in the body
      .attr('class', 'tooltip')       // Give it a CSS class for styling
      .style('position', 'absolute')  // Position it absolutely so we can place it anywhere
      .style('background', 'rgba(0, 0, 0, 0.8)')  // Semi-transparent black background
      .style('color', 'white')        // White text color
      .style('padding', '8px')        // Add some padding inside the tooltip
      .style('border-radius', '4px')  // Rounded corners
      .style('font-size', '12px')     // Small font size
      .style('pointer-events', 'none')  // Don't let the tooltip interfere with mouse events
      .style('opacity', 0);           // Start invisible

    // Function to display the tooltip when hovering over a node
    function showTooltip(event, d) {
      tooltip.transition()            // Start a smooth transition animation
        .duration(200)                // Animation takes 200 milliseconds
        .style('opacity', 1);         // Make the tooltip fully visible
      
      // Set the tooltip content with node information
      tooltip.html(`
        <strong>${d.name}</strong><br/>
        Role: ${d.role}<br/> 
        Department: ${d.department}<br/> 
        Age: ${d.age}<br/> 
        Friends: ${d.friends}  
      `)
        .style('left', (event.pageX + 10) + 'px')  // Position tooltip 10px to the right of mouse
        .style('top', (event.pageY - 10) + 'px');  // Position tooltip 10px above mouse
    }

    // Function to hide the tooltip when mouse leaves a node
    function hideTooltip() {
      tooltip.transition()            // Start a smooth transition animation
        .duration(500)                // Animation takes 500 milliseconds (slower than show)
        .style('opacity', 0);         // Make the tooltip invisible
    }

    // ============================================================================
    // ANIMATION LOOP
    // This function runs every frame during the force simulation to update visual positions
    // ============================================================================

    simulation.on('tick', () => {     // 'tick' event fires every frame of the animation
      // Update the position of all links (lines)
      link
        .attr('x1', d => d.source.x)  // Set the starting X coordinate of each line to the source node's X position
        .attr('y1', d => d.source.y)  // Set the starting Y coordinate of each line to the source node's Y position
        .attr('x2', d => d.target.x)  // Set the ending X coordinate of each line to the target node's X position
        .attr('y2', d => d.target.y); // Set the ending Y coordinate of each line to the target node's Y position

      // Update the position of all nodes (circles)
      node
        .attr('cx', d => d.x)         // Set the center X coordinate of each circle to the node's X position
        .attr('cy', d => d.y);        // Set the center Y coordinate of each circle to the node's Y position

      // Update the position of all labels (text)
      label
        .attr('x', d => d.x)          // Set the X coordinate of each text label to the node's X position
        .attr('y', d => d.y);         // Set the Y coordinate of each text label to the node's Y position
    });

    // ============================================================================
    // DRAG BEHAVIOR
    // Function that creates drag behavior for the nodes
    // ============================================================================

    function drag(simulation) {        // Takes the force simulation as a parameter
      function dragstarted(event, d) {  // Called when user starts dragging a node
        if (!event.active) simulation.alphaTarget(0.3).restart();  // Restart simulation with higher energy if it was cooling down
        d.fx = d.x;                   // Fix the node's X position to where it currently is
        d.fy = d.y;                   // Fix the node's Y position to where it currently is
      }

      function dragged(event, d) {    // Called while user is dragging a node
        d.fx = event.x;               // Update the fixed X position to follow the mouse
        d.fy = event.y;               // Update the fixed Y position to follow the mouse
      }

      function dragended(event, d) {  // Called when user stops dragging a node
        if (!event.active) simulation.alphaTarget(0);  // Let the simulation cool down naturally
        d.fx = null;                  // Remove the fixed X position so the node can move freely again
        d.fy = null;                  // Remove the fixed Y position so the node can move freely again
      }

      return d3.drag()                // Create a new drag behavior
        .on('start', dragstarted)     // Attach the dragstarted function to the 'start' event
        .on('drag', dragged)          // Attach the dragged function to the 'drag' event
        .on('end', dragended);        // Attach the dragended function to the 'end' event
    }
  }
};

// Execute the sketch - this runs the entire graph visualization
graphSketch3(); 