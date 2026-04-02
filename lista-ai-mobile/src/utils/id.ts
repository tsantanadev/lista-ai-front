// Negative local IDs avoid collision with server positive IDs
export const generateLocalId = (): number => -Date.now();
