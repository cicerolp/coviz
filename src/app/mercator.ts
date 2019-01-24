export class Mercator {
  static roundtile(v, z) {
    v = Math.floor(v);
    while (v < 0) v += 1 << z;
    return v % (1 << z);
  }

  static tilex2lon(x, z) {
    return x / (1 << z) * 360.0 - 180;
  }

  static tiley2lat(y, z) {
    var n = Math.PI - 2.0 * Math.PI * y / (1 << z);
    return 180.0 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  }

  static lon2tilex(lon, z) {
    return ((lon + 180.0) / 360.0 * (1 << z));
  }

  static lat2tiley(lat, z) {
    return ((1.0 - Math.log(Math.tan(lat * Math.PI / 180.0) + 1.0 / Math.cos(lat * Math.PI / 180.0)) / Math.PI) / 2.0 * (1 << z));
  }
}
