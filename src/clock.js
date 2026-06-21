// Shared animation clock (seconds), advanced once per frame by the game loop.
// Imported wherever time-based motion is needed (sway, clouds, day/night).
export const clock = { t: 0 };
