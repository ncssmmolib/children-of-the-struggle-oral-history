(function () {
	'use strict';

	L.Routing = L.Routing || {};

	L.Routing.OpenRouteServiceV2 = L.Class.extend({
		initialize: function (apiKey, orsOptions, options) {
			this._apiKey = apiKey;
			this._orsOptions = orsOptions || {};
			L.Util.setOptions(this, options);
		},

		route: function (waypoints, callback, context) {
			var wps = [];

			// Change the coordinates from LatLng to LngLat
			let coordinates = []
			waypoints.forEach(element => {
				coordinates.push([
					element.latLng.lng,
					element.latLng.lat
				])
			});

			// Build the API URL
			var profile = this._orsOptions.profile || 'foot-walking';
			var url = 'https://api.openrouteservice.org/v2/directions/' + profile;

			// Make direct API call using fetch
			fetch(url, {
				method: 'POST',
				headers: {
					'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
					'Authorization': this._apiKey,
					'Content-Type': 'application/json; charset=utf-8'
				},
				body: JSON.stringify({
					coordinates: coordinates,
					units: 'mi'
				})
			})
			.then(response => response.json())
			.then(L.bind(function (json) {
				// Route calculated successfully
				this._routeDone(json, wps, callback, context);
			}, this))
			.catch(function (err) {
				// Error!
				console.error('OpenRouteService API Error:', err);
				callback.call(context, {
					status: 'error',
					message: err.message || 'Failed to calculate route'
				});
			});

			return this;
		},

		_routeDone: function (response, inputWaypoints, callback, context) {
			var alts = [],
				waypoints,
				waypoint,
				coordinates,
				i, j, k,
				instructions,
				distance,
				time,
				leg,
				steps,
				step,
				instruction,
				path;

			context = context || callback;

			if (!response.routes) {
				callback.call(context, {
					status: response.type || 'error',
					message: response.details || response.message || 'No routes found'
				});
				return;
			}

			for (i = 0; i < response.routes.length; i++) {
				path = response.routes[i];
				coordinates = this._decodePolyline(path.geometry);
				instructions = [];
				waypoints = [];
				time = 0;
				distance = 0;

				for (j = 0; j < path.segments.length; j++) {
					leg = path.segments[j];
					steps = leg.steps;
					for (k = 0; k < steps.length; k++) {
						step = steps[k];
						distance += step.distance;
						time += step.duration;
						instruction = this._convertInstructions(step);
						instructions.push(instruction);
					}
				}

				// Use way_points to get actual start/end coordinates
				if (path.way_points && path.way_points.length >= 2) {
					waypoints.push(coordinates[path.way_points[0]]);
					waypoints.push(coordinates[path.way_points[path.way_points.length - 1]]);
				} else {
					waypoints.push(coordinates[0]);
					waypoints.push(coordinates[coordinates.length - 1]);
				}

				alts.push({
					name: 'Route ' + (i + 1),
					coordinates: coordinates,
					instructions: instructions,
					summary: {
						totalDistance: distance,
						totalTime: time
					},
					inputWaypoints: inputWaypoints,
					waypoints: waypoints
				});
			}

			callback.call(context, null, alts);
		},

		_decodePolyline: function (encodedPolyline, includeElevation) {
			// Decode polyline from OpenRouteService
			var points = []
			var index = 0
			var len = encodedPolyline.length
			var lat = 0
			var lng = 0
			var ele = 0

			while (index < len) {
				var b
				var shift = 0
				var result = 0
				do {
					b = encodedPolyline.charAt(index++).charCodeAt(0) - 63
					result |= (b & 0x1f) << shift
					shift += 5
				} while (b >= 0x20)

				lat += ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1))
				shift = 0
				result = 0
				do {
					b = encodedPolyline.charAt(index++).charCodeAt(0) - 63
					result |= (b & 0x1f) << shift
					shift += 5
				} while (b >= 0x20)
				lng += ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1))

				if (includeElevation) {
					shift = 0
					result = 0
					do {
						b = encodedPolyline.charAt(index++).charCodeAt(0) - 63
						result |= (b & 0x1f) << shift
						shift += 5
					} while (b >= 0x20)
					ele += ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1))
				}

				try {
					var location = L.latLng(lat / 1E5, lng / 1E5)
					if (includeElevation) location.alt = ele / 100
					points.push(location)
				} catch (e) {
					console.log(e)
				}
			}
			return points
		},

		_convertInstructions: function (step) {
			return {
				text: step.instruction || '',
				distance: step.distance || 0,
				time: step.duration || 0,
				index: step.way_points ? step.way_points[0] : 0
			};
		}
	});

	L.Routing.openrouteserviceV2 = function (apiKey, orsOptions, options) {
		return new L.Routing.OpenRouteServiceV2(apiKey, orsOptions, options);
	};

})();
