import {feature} from "topojson-client";
import {planarRingArea} from "./planar";

export default function(topology, minWeight, weight) {
  minWeight = minWeight == null ? Number.MIN_VALUE : +minWeight;

  if (weight == null) weight = planarRingArea;

  return function(ring, interior) {
    return weight(feature(topology, {type: "Polygon", arcs: [ring]}).geometry.coordinates[0], interior) >= minWeight;
  };
}
