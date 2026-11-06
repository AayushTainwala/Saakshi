/**
 * Whether body-cam is recording now, for the secret code (round 2, group 1.2): its reset with the
 * phone's passcode is offered only while nothing is running. Set by the body-cam screen.
 */
let running = false;

export function setBodyCamRunning(on: boolean): void {
  running = on;
}

export function isBodyCamRunning(): boolean {
  return running;
}
