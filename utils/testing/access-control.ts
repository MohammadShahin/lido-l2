import { AccessControl, AccessControlEnumerable } from "../../typechain";

export async function getRoleHolders(
  accessControl: AccessControl,
  role: string,
  fromBlockOrBlockHash?: number | string
) {
  const grantedRolesFilter = accessControl.filters.RoleGranted(role);
  const revokedRolesFilter = accessControl.filters.RoleRevoked(role);

  const roleGrantedEvents = await accessControl.queryFilter(
    grantedRolesFilter,
    fromBlockOrBlockHash
  );
  const roleRevokedEvents = await accessControl.queryFilter(
    revokedRolesFilter,
    fromBlockOrBlockHash
  );

  const sortedEvents = [...roleGrantedEvents, ...roleRevokedEvents].sort(
    (e1, e2) => {
      return (
        e1.blockNumber - e2.blockNumber ||
        e1.transactionIndex - e2.transactionIndex ||
        e1.logIndex - e2.logIndex
      );
    }
  );

  const accounts = new Set<string>();
  for (const event of sortedEvents) {
    if (event.event === "RoleGranted") {
      accounts.add(event.args.account);
    } else if (event.event === "RoleRevoked") {
      accounts.delete(event.args.account);
    } else {
      throw new Error(`Unknown event name ${event.event}`);
    }
  }
  return accounts;
}

export async function getHoldersEnumerable(
  accessControlEnumerable: AccessControlEnumerable,
  role: string
) {
  const roleCount = (
    await accessControlEnumerable.getRoleMemberCount(role)
  ).toNumber();
  const holders = new Set<string>();
  for (let i = 0; i < roleCount; i++) {
    const disabler = await accessControlEnumerable.getRoleMember(role, i);
    holders.add(disabler);
  }
  return holders;
}
