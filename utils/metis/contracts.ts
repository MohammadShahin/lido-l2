import {
  CanonicalTransactionChainMetis__factory,
  CrossDomainMessengerStubMetis__factory,
  L1CrossDomainMessengerMetis__factory,
  L2CrossDomainMessengerMetis__factory,
  LibAddressManagerMetis__factory
} from "../../typechain";
import addresses from "./addresses";
import { CommonOptions } from "./types";
import network, { NetworkName } from "../network";

interface ContractsOptions extends CommonOptions {
  forking: boolean;
}

export default function contracts(
  networkName: NetworkName,
  options: ContractsOptions
) {
  const [l1Provider, l2Provider] = network
    .multichain(["eth", "mts"], networkName)
    .getProviders(options);

  const mtsAddresses = addresses(networkName, options);

  return {
    L1CrossDomainMessenger: L1CrossDomainMessengerMetis__factory.connect(
      mtsAddresses.L1CrossDomainMessenger,
      l1Provider
    ),
    L1CrossDomainMessengerStub: CrossDomainMessengerStubMetis__factory.connect(
      mtsAddresses.L1CrossDomainMessenger,
      l1Provider
    ),
    L2CrossDomainMessenger: L2CrossDomainMessengerMetis__factory.connect(
      mtsAddresses.L2CrossDomainMessenger,
      l2Provider
    ),
    CanonicalTransactionChain: CanonicalTransactionChainMetis__factory.connect(
      mtsAddresses.CanonicalTransactionChain,
      l1Provider
    ),
    LibAddressManagerMetis: LibAddressManagerMetis__factory.connect(
      mtsAddresses.AddressManager,
      l1Provider
    )
  };
}
