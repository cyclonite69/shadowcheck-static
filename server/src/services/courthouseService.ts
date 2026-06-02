const {
  fetchFederalCourthousesGeoJSON,
  findNearestCourthousesBatch,
} = require('../repositories/courthouseRepository');

module.exports = {
  getFederalCourthousesGeoJSON: fetchFederalCourthousesGeoJSON,
  getNearestCourthousesBatch: findNearestCourthousesBatch,
};
