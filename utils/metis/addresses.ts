import { NetworkName } from "../network";
import { MtsContractAddresses, CommonOptions } from "./types";

const MetisMainnetAddresses: MtsContractAddresses = {
  L1CrossDomainMessenger: "0x081D1101855bD523bA69A9794e0217F0DB6323ff",
  L2CrossDomainMessenger: "0x4200000000000000000000000000000000000007",
  CanonicalTransactionChain: "0x56a76bcC92361f6DF8D75476feD8843EdC70e1C9",
  AddressManager: "0x918778e825747a892b17C66fe7D24C618262867d",
};

const MetisSepoliaAddresses: MtsContractAddresses = {
  L1CrossDomainMessenger: "0x4542c621eEe9fC533c2e6bd80880C89990EE10cD",
  L2CrossDomainMessenger: "0x4200000000000000000000000000000000000007",
  CanonicalTransactionChain: "0x5435d351e0aCc874579eC67Ba46440ee6AC892b8",
  AddressManager: "0xa66Fa1eD0f1C1ee300893B4eb5493FeAD9a7e9c3",
};

const MetisGoerliAddresses: MtsContractAddresses = {
  L1CrossDomainMessenger: "0x914Aed79Cd083B5043C75A90616CC2A0477bf86c",
  L2CrossDomainMessenger: "0x4200000000000000000000000000000000000007",
  CanonicalTransactionChain: "0x6Aec60fc997B4e2931b892398517b56F7b3C48Dd",
  AddressManager: "0x0C40f1f7A3B348F8e223F25e9d5808eA5FB43349",
};

export default function addresses(
  networkName: NetworkName,
  options: CommonOptions = {}
) {
  switch (networkName) {
    case "mainnet":
      return { ...MetisMainnetAddresses, ...options.customAddresses };
    case "sepolia":
      return { ...MetisSepoliaAddresses, ...options.customAddresses };
    case "goerli":
      return { ...MetisGoerliAddresses, ...options.customAddresses };
    default:
      throw new Error(`Network "${networkName}" is not supported`);
  }
}
