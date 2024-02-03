import { NetworkName } from "../network";
import { MtsContractAddresses, CommonOptions } from "./types";

const MetisMainnetAddresses: MtsContractAddresses = {
  L1CrossDomainMessenger: "0x081D1101855bD523bA69A9794e0217F0DB6323ff",
  L2CrossDomainMessenger: "0x4200000000000000000000000000000000000007",
  CanonicalTransactionChain: "0x56a76bcC92361f6DF8D75476feD8843EdC70e1C9",
  AddressManager: "0x918778e825747a892b17C66fe7D24C618262867d",
};

// const MetisHoleskyAddresses: MtsContractAddresses = {
//   L1CrossDomainMessenger: "0x28e40796a3228a59af95021E576A5858ffc3646E",
//   L2CrossDomainMessenger: "0x4200000000000000000000000000000000000007",
//   CanonicalTransactionChain: "0xa39a011d1Ef5662BcbCD28f73c2f039bef77a307",
//   AddressManager: "0x23ac2fEd119dAD4fcE4A7a439440627d31e10F9E",
// };

const MetisSepoliaAddresses: MtsContractAddresses = {
  L1CrossDomainMessenger: "0x46fa781883aEC3269C5eff9beD69770404bC68e9",
  L2CrossDomainMessenger: "0x4200000000000000000000000000000000000007",
  CanonicalTransactionChain: "0x9eA62b728e56d5AefC911B5C019CEFc829968833",
  AddressManager: "0x01Af3B22741408d8fEfEFD82ba80472442975fD8",
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
    // case "holesky":
    //   return { ...MetisHoleskyAddresses, ...options.customAddresses };
    case "sepolia":
      return { ...MetisSepoliaAddresses, ...options.customAddresses };
    case "goerli":
      return { ...MetisGoerliAddresses, ...options.customAddresses };
    default:
      throw new Error(`Network "${networkName}" is not supported`);
  }
}
