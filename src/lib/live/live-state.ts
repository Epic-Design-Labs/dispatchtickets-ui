/**
 * Whether the account-wide live stream is connected in this tab. While it
 * is, it alerts on chats instantly and the 2-minute poller stays quiet about
 * them; if it drops, the poller picks chats back up.
 */
let connected = false;

export function isLiveConnected(): boolean {
  return connected;
}

export function setLiveConnected(value: boolean): void {
  connected = value;
}
