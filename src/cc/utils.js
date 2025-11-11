// Buffer functions
function addBuffer(feature, value){
    try{
        return truncateGeoJSON(turf.buffer(feature, value, {units: 'meters'}));
    }catch(error){
        console.log(feature)
        console.log(error)
    }
}

function addBufferMany(features, value){
    let buffered = [];
    for(let feature of features){
        buffered.push(addBuffer(feature, value));
    }
    return buffered;
}

// Geo utils

function truncateGeoJSON(geojson, decimals = 7) {
  const factor = Math.pow(10, decimals);

  // Helper: truncate a single number
  const trunc = (num) => Math.trunc(num * factor) / factor;

  // Helper: truncate a single coordinate [lon, lat, (optional alt)]
  const truncateCoord = (coord) => coord.map(trunc);

  // Recursively truncate coordinate arrays (works for all geometry types)
  const truncateCoords = (coords) => {
    if (typeof coords[0] === "number") {
      // Single coordinate
      return truncateCoord(coords);
    }
    // Nested coordinates
    return coords.map(truncateCoords);
  };

  // Process any geometry object
  const processGeometry = (geometry) => {
    if (!geometry) return geometry;

    switch (geometry.type) {
      case "Point":
      case "MultiPoint":
      case "LineString":
      case "MultiLineString":
      case "Polygon":
      case "MultiPolygon":
        return {
          ...geometry,
          coordinates: truncateCoords(geometry.coordinates),
        };

      case "GeometryCollection":
        return {
          ...geometry,
          geometries: geometry.geometries.map(processGeometry),
        };

      default:
        // Unrecognized geometry type, return as-is
        return geometry;
    }
  };

  // Handle FeatureCollection
  if (geojson.type === "FeatureCollection") {
    return {
      ...geojson,
      features: geojson.features.map((f) => ({
        ...f,
        geometry: processGeometry(f.geometry),
      })),
    };
  }

  // Handle Feature
  if (geojson.type === "Feature") {
    return {
      ...geojson,
      geometry: processGeometry(geojson.geometry),
    };
  }

  // Otherwise assume it's a bare Geometry
  return processGeometry(geojson);
}

//bulk functions
function differenceMany(feature, features){
    let diff = feature;
    for(let f of features){
        diff = turf.difference(diff, f);
    } 
    return diff;
}

function unionMany(feature, features){
    let union = feature;
    for(let f of features){
        union = turf.union(union, f);
    }
    return union;
}

function unionArray(features){
    let union = features.shift();
    for(let f of features){
        union = turf.union(union, f);
    }
    return union;
}

function divideArea(bounds, numAreas, horizontal=true){
	        
    let bbox = turf.bbox(bounds);
    let minX = bbox[0];
    let minY = bbox[1];
    let maxX = bbox[2];
    let maxY = bbox[3];
    
    let deltaX = (maxX - minX) / numAreas;
    let deltaY = (maxY - minY) / numAreas;
    let subAreas = [];
    
    
    for(let i = 0; i < numAreas; i++){
        let points;
        if(horizontal){
            points = [[
                [minX + (i*deltaX), maxY],
                [minX + ((i+1)*deltaX), maxY],
                [minX + ((i+1)*deltaX), minY],
                [minX + (i*deltaX), minY],
                [minX + (i*deltaX), maxY]
            ]];
        }else{
            points = [[
                [minX, maxY - (i*deltaY)],
                [maxX, maxY - (i*deltaY)],
                [maxX, maxY - ((i+1)*deltaY)],
                [minX, maxY - ((i+1)*deltaY)],
                [minX, maxY - (i*deltaY)]
            ]];
        }
        
        let subArea = addBuffer(turf.polygon(points), 0.01);
        subAreas.push(turf.intersect(subArea, bounds));
    }

    return subAreas;
}
