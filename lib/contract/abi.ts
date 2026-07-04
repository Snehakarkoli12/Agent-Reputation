// Paste the ABI array from your compiled artifact here.
export const AGENT_PASSPORT_REGISTRY_ABI = [
  "function updatePassportHash(bytes32 agentId, bytes32 stateHash) external",
  "function getPassport(bytes32 agentId) external view returns (bytes32 stateHash, uint256 updatedAt, uint256 version, address updatedBy)",
  "event PassportUpdated(bytes32 indexed agentId, bytes32 stateHash, uint256 version, uint256 timestamp, address updatedBy)",
] as const;