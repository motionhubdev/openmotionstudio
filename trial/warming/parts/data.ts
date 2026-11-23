// Global mean surface temperature, land + ocean (air temperature over sea ice), one value a year from 1850 to 2024.
// Source: Berkeley Earth, Land_and_Ocean_summary.txt (Rohde & Hausfather 2020, ESSD 12, 3469-3479; analysis of Jan 2025),
// https://berkeley-earth-temperature.s3.us-west-1.amazonaws.com/Global/Land_and_Ocean_summary.txt (CC BY 4.0).
// The file gives anomalies against 1951-1980; here each is re-based on the 1850-1900 mean (-0.306 °C in the file's terms),
// so 0 is the pre-industrial level the film talks about. Rounded to 0.01 °C.
export const FIRST_YEAR = 1850;
export const ANOMALY: number[] = [-0.13, -0.01, 0.01, 0.01, 0.02, 0.03, -0.09, -0.23, -0.03, 0.08, -0.07, -0.15, -0.25, -0.01, -0.04, 0.06, 0.1, 0.14, 0.1, 0.09, 0.02, -0.01, 0.02, 0.05, 0.0, -0.04, -0.04, 0.33, 0.43, 0.07, 0.01, 0.12, 0.06, 0.0, -0.17, -0.13, -0.16, -0.19, 0.01, 0.13, -0.16, -0.04, -0.1, -0.07, -0.07, -0.01, 0.08, 0.1, -0.11, 0.06, 0.17, 0.1, -0.07, -0.16, -0.22, -0.04, 0.05, -0.13, -0.14, -0.21, -0.17, -0.18, -0.1, -0.07, 0.11, 0.17, -0.07, -0.22, -0.05, 0.01, 0.07, 0.12, 0.04, 0.07, 0.06, 0.1, 0.24, 0.12, 0.13, -0.05, 0.18, 0.24, 0.2, 0.0, 0.15, 0.09, 0.16, 0.32, 0.32, 0.3, 0.38, 0.34, 0.35, 0.41, 0.51, 0.38, 0.23, 0.3, 0.21, 0.2, 0.14, 0.32, 0.39, 0.46, 0.27, 0.21, 0.13, 0.36, 0.36, 0.35, 0.29, 0.36, 0.31, 0.35, 0.09, 0.2, 0.27, 0.3, 0.22, 0.37, 0.32, 0.2, 0.31, 0.45, 0.24, 0.31, 0.21, 0.54, 0.42, 0.49, 0.62, 0.67, 0.45, 0.63, 0.46, 0.46, 0.52, 0.66, 0.7, 0.58, 0.77, 0.76, 0.55, 0.61, 0.66, 0.82, 0.7, 0.84, 0.99, 0.75, 0.75, 0.89, 0.98, 0.96, 0.87, 1.04, 0.99, 1.0, 0.88, 1.01, 1.08, 0.97, 0.99, 1.01, 1.09, 1.23, 1.37, 1.27, 1.19, 1.33, 1.36, 1.2, 1.24, 1.54, 1.62];

/** Means computed from ANOMALY (a calculation, labelled as one on screen) */
export const mean = (from: number, to: number) => {
  const v = ANOMALY.slice(from - FIRST_YEAR, to - FIRST_YEAR + 1);
  return v.reduce((a, b) => a + b, 0) / v.length;
};
