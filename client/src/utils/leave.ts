export function availableBalance(entitled: number, carried: number, used: number, pending: number) {
  return entitled + carried - used - pending;
}
