import { ethers } from "ethers";
import { AGENT_PASSPORT_REGISTRY_ABI } from "./abi";

// Read-only provider — usable client or server side.
export function getReadProvider() {
  return new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
}

// Server-only signer for writing hashes on-chain.
export function getServerSigner() {
  const provider = getReadProvider();
  return new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider);
}

export function getRegistryContract(signerOrProvider: ethers.Signer | ethers.Provider) {
  return new ethers.Contract(
    process.env.CONTRACT_ADDRESS!,
    AGENT_PASSPORT_REGISTRY_ABI,
    signerOrProvider
  );
}

/// Converts an agent's UUID into the bytes32 key the contract expects.
export function agentIdToBytes32(agentId: string): string {
  return ethers.id(agentId); // keccak256(utf8Bytes(agentId))
}