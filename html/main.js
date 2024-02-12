document.addEventListener('DOMContentLoaded', async function() {
  const nodes = await fetchNodes();
  initMap(nodes);
  initChart(nodes);
});

const fetchNodes = async () => {
  const nodes = await fetch("nodes.json");
  let data = await nodes.json();
  data = data.map((node) => ({
    type: "Feature",
    properties: { ip: node.ip, asn: node.asn },
    geometry: {
      type: "Point",
      coordinates: [node.location.Longitude, node.location.Latitude],
    },
  }))

  console.log(data);
  return data;
}

const initMap = (nodes) => {
  const map = new maplibregl.Map({
	  container: 'map',
	  style: {
	    version: 8,
	    sources: {
	      'raster-tiles': {
		type: 'raster',
		tiles: ['https://tile.openstreetmap.de/{z}/{x}/{y}.png'],
		tileSize: 256,
		attribution: 'OSM'
	      },
	    },
	    layers: [
		{
		    id: 'simple-tiles',
		    type: 'raster',
		    source: 'raster-tiles',
		    minzoom: 0,
		    maxzoom: 22
		}
	    ],
	  },
	  center: [13.526712926907999, 52.45714286038891],
	  zoom: 7
      });

      map.on('load', () => {
	  map.addSource('nodes', {
	      type: 'geojson',
	      data: {
		type: 'FeatureCollection',
		features: nodes
	      }
	  });

	  // Add a layer showing the places.
	  map.addLayer({
	    'id': 'nodes',
	    'type': 'circle',
	    'source': 'nodes',
	    'paint': {
	    'circle-color': '#552cb7',
	    'circle-radius': 6,
	    'circle-stroke-width': 1,
	    'circle-stroke-color': '#ffffff'
	    }
	  });

	  // Create a popup, but don't add it to the map yet.
	  const popup = new maplibregl.Popup({
	      closeButton: false,
	      closeOnClick: false
	  });


	  // Change the cursor to a pointer when the it enters a feature in the 'symbols' layer.
	  map.on('mouseenter', 'nodes', (e) => {
	      map.getCanvas().style.cursor = 'pointer';

	      const coordinates = e.features[0].geometry.coordinates.slice();
	      const description = e.features[0].properties.ip + " " + e.features[0].properties.asn;

	      // Ensure that if the map is zoomed out such that multiple
	      // copies of the feature are visible, the popup appears
	      // over the copy being pointed to.
	      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
		  coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
	      }

	      // Populate the popup and set its coordinates
	      // based on the feature found.
	      popup.setLngLat(coordinates).setHTML(description).addTo(map);
	  });

	  // Change it back to a pointer when it leaves.
	  map.on('mouseleave', 'nodes', () => {
	      map.getCanvas().style.cursor = '';
	      popup.remove();
	  });

      });
}

const initChart = (nodes) => {
  let groups = d3.flatGroup(nodes, d => d.properties.asn);
  console.log(groups);
  groups = d3.sort(groups, (a, b) => d3.descending(a[1].length, b[1].length));
  console.log(groups);

  const barHeight = 25;
  const marginTop = 0;
  const marginBottom = 10;
  const marginRight = 0;
  const marginLeft = 0;
  const width = 600;
  const height = Math.ceil((groups.length + 0.1) * barHeight) + marginTop + marginBottom;
  console.log(height);

  const chart = d3.select("#chart")

  // Create scales
  const x = d3.scaleLinear()
    .domain([0, d3.max(groups, g => g[1].length)])
    .range([0, width -  marginLeft - marginRight]);
  console.log(x.domain());

  const y = d3.scaleBand()
    .domain(groups.map(d => d[0]))
    .rangeRound([marginTop, height - marginBottom - marginTop])
    .padding(0.1);
  console.log(y.domain());

  const format = x.tickFormat(20);

  chart.append("p")
    .text("Number of nodes: " + Intl.NumberFormat('de-DE').format(nodes.length));
  chart.append("p")
    .text("Number of ASN: " + Intl.NumberFormat('de-DE').format(groups.length));

  const svg = chart.append("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width)
    .attr("height", height)
    .attr("style", "max-width: 100%; height: auto; min-height: 200px; font-size: 10px;");


  svg.append("g")
    .attr("fill", "#552cb7")
    .selectAll()
    .data(groups)
    .join("rect")
      .attr("x", x(0) + marginLeft)
      .attr("y", d => y(d[0]))
      .attr("width", d => x(d[1].length))
      .attr("height", y.bandwidth());

  console.log(y.bandwidth());

  svg.append("g")
    .attr("fill", "white")
    .attr("text-anchor", "end")
    .selectAll()
    .data(groups)
    .join("text")
      .attr("x", d => x(d[1].length) + marginLeft)
      .attr("y", d => y(d[0]) + y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("dx", -4)
      .text(d => d[0] +" - "+ d[1].length)
    .call(text => text.filter(d => x(d[1].length) - x(0) < 200) // short bars
      .attr("dx", +4)
      .attr("fill", "black")
      .attr("text-anchor", "start"))
      .text(d => d[1].length +" - "+ d[0] );

  svg.append("g")
    .attr("style", "font-size: 8px;")
    .attr("transform", `translate(${marginLeft}, 0)`)
    .call(d3.axisLeft(y).tickSizeOuter(0))
}


