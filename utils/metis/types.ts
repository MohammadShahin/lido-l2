export type MtsContractNames =
  | "L1CrossDomainMessenger"
  | "L2CrossDomainMessenger"
  | "CanonicalTransactionChain"
  | "AddressManager";

export type MtsContractAddresses = Record<MtsContractNames, string>;
export type CustomMtsContractAddresses = Partial<MtsContractAddresses>;
export interface CommonOptions {
  customAddresses?: CustomMtsContractAddresses;
}
