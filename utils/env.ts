import { toAddress } from "@eth-optimism/sdk";
import { NetworkName } from "./network";

function getString(variableName: string, defaultValue?: string) {
  const value = process.env[variableName];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(
      `ENV variable ${variableName} is not set and default value wasn't provided`
    );
  }
  return (value || defaultValue) as string;
}

function getAddress(variableName: string, defaultValue?: string) {
  return toAddress(getString(variableName, defaultValue));
}

function getEnum<T extends string>(
  variableName: string,
  allowedValues: [T, ...T[]],
  defaultValue?: T
) {
  const value = getString(variableName, defaultValue) as T;
  if (!allowedValues.includes(value)) {
    throw new Error(
      `Variable ${variableName}=${value} not in allowed values: ${allowedValues}`
    );
  }
  return value;
}

function getBool(variableName: string, defaultValue?: boolean) {
  return getString(variableName, defaultValue?.toString()) === "true";
}

function getList(variableName: string, defaultValue?: string[]) {
  const value = JSON.parse(
    getString(variableName, JSON.stringify(defaultValue))
  );
  if (!Array.isArray(value)) {
    throw new Error(`ENV variable ${variableName} is not valid array`);
  }
  return value;
}

function getAddressList(variableName: string, defaultValue?: string[]) {
  return getList(variableName, defaultValue).map(toAddress);
}

function getNetwork(name: string = "NETWORK", defaultNetwork?: NetworkName) {
  return getEnum(name, ["mainnet", "goerli", "sepolia"], defaultNetwork);
}

function getPrivateKey() {
  return getString("ETH_DEPLOYER_PRIVATE_KEY");
}

function getForking() {
  return getBool("FORKING", false);
}

function getBridgeExecutorConfig() {
  return {
    delay: getString("EXECUTION_DELAY", "172800") as string,
    gradePeriod: getString("EXECUTION_GRACE_PERIOD", "259200") as string,
    minDelay: getString("EXECUTION_MIN_DELAY", "28800") as string,
    maxDelay: getString("EXECUTION_MAX_DELAY", "604800") as string,
    guardian: getAddress("EXECUTION_GUARDIAN"),
    l1ExecutorAddress: getAddress("L1_EXECUTOR_ADDR") as string,
  } as const;
}

export default {
  string: getString,
  list: getList,
  enum: getEnum,
  bool: getBool,
  address: getAddress,
  addresses: getAddressList,
  network: getNetwork,
  privateKey: getPrivateKey,
  forking: getForking,
  bridgeExecutorConfig: getBridgeExecutorConfig,
};
