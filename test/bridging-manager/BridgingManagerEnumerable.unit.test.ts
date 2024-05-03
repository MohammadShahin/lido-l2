import hre from "hardhat";
import {
  BridgingManagerEnumerable__factory,
  OssifiableProxy__factory,
} from "../../typechain";
import { assert } from "chai";
import { unit } from "../../utils/testing";

unit("BridgingManagerEnumerable", ctxFactory)
  .test("isInitialized() :: on uninitialized contract", async (ctx) => {
    assert.isFalse(await ctx.bridgingManagerEnumerableRaw.isInitialized());
  })

  .test("isDepositsEnabled() :: on uninitialized contract", async (ctx) => {
    assert.isFalse(await ctx.bridgingManagerEnumerableRaw.isDepositsEnabled());
  })

  .test("isWithdrawalsEnabled() :: on uninitialized contract", async (ctx) => {
    assert.isFalse(
      await ctx.bridgingManagerEnumerableRaw.isWithdrawalsEnabled()
    );
  })

  .test("initialize() :: on uninitialized contract", async (ctx) => {
    const {
      bridgingManagerEnumerableRaw,
      roles: { DEFAULT_ADMIN_ROLE },
      accounts: { stranger },
    } = ctx;
    // validate that bridgingManagerEnumerable is not initialized
    assert.isFalse(await bridgingManagerEnumerableRaw.isInitialized());

    // validate that stranger has no DEFAULT_ADMIN_ROLE
    assert.isFalse(
      await bridgingManagerEnumerableRaw.hasRole(
        DEFAULT_ADMIN_ROLE,
        stranger.address
      )
    );
    // initialize() might be called by anyone
    await bridgingManagerEnumerableRaw
      .connect(stranger)
      .initialize(stranger.address);

    // validate that isInitialized() is true
    assert.isTrue(await bridgingManagerEnumerableRaw.isInitialized());

    // validate that stranger has DEFAULT_ADMIN_RULE
    assert.isTrue(
      await bridgingManagerEnumerableRaw.hasRole(
        DEFAULT_ADMIN_ROLE,
        stranger.address
      )
    );

    // validate that initialize() might not be called second time
    await assert.revertsWith(
      bridgingManagerEnumerableRaw
        .connect(stranger)
        .initialize(stranger.address),
      "ErrorAlreadyInitialized"
    );
  })

  .test("enableDeposits() :: role is not granted", async (ctx) => {
    const {
      bridgingManagerEnumerable,
      accounts: { stranger },
      roles: { DEPOSITS_ENABLER_ROLE },
    } = ctx;

    // validate that deposits are disabled
    assert.isFalse(await bridgingManagerEnumerable.isDepositsEnabled());

    // validate that stranger has no DEPOSITS_ENABLER_ROLE
    assert.isFalse(
      await bridgingManagerEnumerable.hasRole(
        DEPOSITS_ENABLER_ROLE,
        stranger.address
      )
    );

    await assert.revertsWith(
      bridgingManagerEnumerable.connect(stranger).enableDeposits(),
      accessControlRevertMessage(DEPOSITS_ENABLER_ROLE, stranger.address)
    );
  })

  .test("enableDeposits() :: role is granted", async (ctx) => {
    const {
      bridgingManagerEnumerable,
      accounts: { depositsEnabler },
    } = ctx;

    // validate that deposits are disabled
    assert.isFalse(await bridgingManagerEnumerable.isDepositsEnabled());

    // validate that depositsEnabler can enable deposits
    const tx = await bridgingManagerEnumerable
      .connect(depositsEnabler)
      .enableDeposits();

    // validate that DepositsEnabled(enabler) event was emitted
    await assert.emits(bridgingManagerEnumerable, tx, "DepositsEnabled", [
      depositsEnabler.address,
    ]);

    // validate that deposits are enabled
    assert.isTrue(await bridgingManagerEnumerable.isDepositsEnabled());

    // validate that deposits can't be enabled if it's already enabled
    await assert.revertsWith(
      bridgingManagerEnumerable.connect(depositsEnabler).enableDeposits(),
      "ErrorDepositsEnabled"
    );
  })

  .test("disableDeposits() :: deposits disabled", async (ctx) => {
    const {
      bridgingManagerEnumerable,
      accounts: { depositsDisabler },
    } = ctx;

    // validate that deposits are disabled
    assert.isFalse(await bridgingManagerEnumerable.isDepositsEnabled());

    // validate that disableDeposits reverts with error ErrorDepositsDisabled()
    await assert.revertsWith(
      bridgingManagerEnumerable.connect(depositsDisabler).disableDeposits(),
      "ErrorDepositsDisabled"
    );
  })

  .test("disableDeposits() :: role is not granted", async (ctx) => {
    const {
      bridgingManagerEnumerable,
      accounts: { stranger, depositsEnabler },
      roles: { DEPOSITS_DISABLER_ROLE },
    } = ctx;

    // enable deposits
    await bridgingManagerEnumerable.connect(depositsEnabler).enableDeposits();

    // validate deposits are enabled
    assert.isTrue(await bridgingManagerEnumerable.isDepositsEnabled());

    // validate that stranger has no DEPOSITS_DISABLER_ROLE
    assert.isFalse(
      await bridgingManagerEnumerable.hasRole(
        DEPOSITS_DISABLER_ROLE,
        stranger.address
      )
    );

    await assert.revertsWith(
      bridgingManagerEnumerable.connect(stranger).disableDeposits(),
      accessControlRevertMessage(DEPOSITS_DISABLER_ROLE, stranger.address)
    );
  })

  .test("disableDeposits() :: role is granted", async (ctx) => {
    const {
      bridgingManagerEnumerable,
      accounts: { depositsEnabler, depositsDisabler },
    } = ctx;

    // enable deposits
    await bridgingManagerEnumerable.connect(depositsEnabler).enableDeposits();

    // validate that deposits are enabled
    assert.isTrue(await bridgingManagerEnumerable.isDepositsEnabled());

    // validate that depositsDisabler can disable deposits
    const tx = await bridgingManagerEnumerable
      .connect(depositsDisabler)
      .disableDeposits();

    // validate that DepositsDisabled(disabler) event was emitted
    await assert.emits(bridgingManagerEnumerable, tx, "DepositsDisabled", [
      depositsDisabler.address,
    ]);

    // validate that deposits are not active
    assert.isFalse(await bridgingManagerEnumerable.isDepositsEnabled());

    // validate that deposits can't be disabled if it's not active
    await assert.revertsWith(
      bridgingManagerEnumerable.connect(depositsDisabler).disableDeposits(),
      "ErrorDepositsDisabled"
    );
  })

  .test("enableWithdrawals() :: role is not granted", async (ctx) => {
    const {
      bridgingManagerEnumerable,
      accounts: { stranger },
      roles: { WITHDRAWALS_ENABLER_ROLE },
    } = ctx;

    // validate that withdrawals are disabled
    assert.isFalse(await bridgingManagerEnumerable.isWithdrawalsEnabled());

    // validate that stranger has no WITHDRAWALS_ENABLER_ROLE
    assert.isFalse(
      await bridgingManagerEnumerable.hasRole(
        WITHDRAWALS_ENABLER_ROLE,
        stranger.address
      )
    );

    await assert.revertsWith(
      bridgingManagerEnumerable.connect(stranger).enableWithdrawals(),
      accessControlRevertMessage(WITHDRAWALS_ENABLER_ROLE, stranger.address)
    );
  })

  .test("enableWithdrawals() :: role is granted", async (ctx) => {
    const {
      bridgingManagerEnumerable,
      accounts: { withdrawalsEnabler },
    } = ctx;

    // validate that withdrawals are disabled
    assert.isFalse(await bridgingManagerEnumerable.isWithdrawalsEnabled());

    // validate that withdrawalsEnabler can enable withdrawals
    const tx = await bridgingManagerEnumerable
      .connect(withdrawalsEnabler)
      .enableWithdrawals();

    // validate that WithdrawalsEnabled(enabler) event was emitted
    await assert.emits(bridgingManagerEnumerable, tx, "WithdrawalsEnabled", [
      withdrawalsEnabler.address,
    ]);

    // validate that withdrawals are enabled
    assert.isTrue(await bridgingManagerEnumerable.isWithdrawalsEnabled());

    // validate that withdrawals can't be enabled if it's already enabled
    await assert.revertsWith(
      bridgingManagerEnumerable.connect(withdrawalsEnabler).enableWithdrawals(),
      "ErrorWithdrawalsEnabled"
    );
  })

  .test("disableWithdrawals() :: withdrawals disabled", async (ctx) => {
    const {
      bridgingManagerEnumerable,
      accounts: { withdrawalsDisabler },
    } = ctx;

    // validate that deposits are disabled
    assert.isFalse(await bridgingManagerEnumerable.isDepositsEnabled());

    // validate that disableWithdrawals reverts with error ErrorWithdrawalsDisabled()
    await assert.revertsWith(
      bridgingManagerEnumerable
        .connect(withdrawalsDisabler)
        .disableWithdrawals(),
      "ErrorWithdrawalsDisabled"
    );
  })

  .test("disableWithdrawals() :: role is not granted", async (ctx) => {
    const {
      bridgingManagerEnumerable,
      accounts: { stranger, withdrawalsEnabler },
      roles: { WITHDRAWALS_DISABLER_ROLE },
    } = ctx;

    // enable withdrawals
    await bridgingManagerEnumerable
      .connect(withdrawalsEnabler)
      .enableWithdrawals();

    // validate withdrawals are enabled
    assert.isTrue(await bridgingManagerEnumerable.isWithdrawalsEnabled());

    // validate that stranger has no WITHDRAWALS_DISABLER_ROLE
    assert.isFalse(
      await bridgingManagerEnumerable.hasRole(
        WITHDRAWALS_DISABLER_ROLE,
        stranger.address
      )
    );

    await assert.revertsWith(
      bridgingManagerEnumerable.connect(stranger).disableWithdrawals(),
      accessControlRevertMessage(WITHDRAWALS_DISABLER_ROLE, stranger.address)
    );
  })

  .test("disableWithdrawals() :: role is granted", async (ctx) => {
    const {
      bridgingManagerEnumerable,
      accounts: { withdrawalsEnabler, withdrawalsDisabler },
    } = ctx;

    // enable withdrawals
    await bridgingManagerEnumerable
      .connect(withdrawalsEnabler)
      .enableWithdrawals();

    // validate that withdrawals are enabled
    assert.isTrue(await bridgingManagerEnumerable.isWithdrawalsEnabled());

    // validate that withdrawalsDisabler can disable withdrawals
    const tx = await bridgingManagerEnumerable
      .connect(withdrawalsDisabler)
      .disableWithdrawals();

    // validate that WithdrawalsDisabled(disabler) event was emitted
    await assert.emits(bridgingManagerEnumerable, tx, "WithdrawalsDisabled", [
      withdrawalsDisabler.address,
    ]);

    // validate that withdrawals are not active
    assert.isFalse(await bridgingManagerEnumerable.isWithdrawalsEnabled());

    // validate that withdrawals can't be disabled if it's not active
    await assert.revertsWith(
      bridgingManagerEnumerable
        .connect(withdrawalsDisabler)
        .disableWithdrawals(),
      "ErrorWithdrawalsDisabled"
    );
  })

  .test("enumerate deposit enablers", async (ctx) => {
    const {
      bridgingManagerEnumerable,
      depositEnablers,
      roles: { DEPOSITS_ENABLER_ROLE },
    } = ctx;
    const roleCount = (
      await bridgingManagerEnumerable.getRoleMemberCount(DEPOSITS_ENABLER_ROLE)
    ).toNumber();
    assert.equal(roleCount, depositEnablers.length);
    for (let i = 0; i < roleCount; i++) {
      const enabler = await bridgingManagerEnumerable.getRoleMember(
        DEPOSITS_ENABLER_ROLE,
        i
      );
      assert.isTrue(
        depositEnablers.map((enabler) => enabler.address).includes(enabler)
      );
    }
  })

  .test("enumerate deposit disablers", async (ctx) => {
    const {
      bridgingManagerEnumerable,
      depositDisablers,
      roles: { DEPOSITS_DISABLER_ROLE },
    } = ctx;
    const roleCount = (
      await bridgingManagerEnumerable.getRoleMemberCount(DEPOSITS_DISABLER_ROLE)
    ).toNumber();
    assert.equal(roleCount, depositDisablers.length);
    for (let i = 0; i < roleCount; i++) {
      const disabler = await bridgingManagerEnumerable.getRoleMember(
        DEPOSITS_DISABLER_ROLE,
        i
      );
      assert.isTrue(
        depositDisablers.map((disabler) => disabler.address).includes(disabler)
      );
    }
  })

  .test("enumerate withdrawal enablers", async (ctx) => {
    const {
      bridgingManagerEnumerable,
      withdrawalEnablers,
      roles: { WITHDRAWALS_ENABLER_ROLE },
    } = ctx;
    const roleCount = (
      await bridgingManagerEnumerable.getRoleMemberCount(
        WITHDRAWALS_ENABLER_ROLE
      )
    ).toNumber();
    assert.equal(roleCount, withdrawalEnablers.length);
    for (let i = 0; i < roleCount; i++) {
      const enabler = await bridgingManagerEnumerable.getRoleMember(
        WITHDRAWALS_ENABLER_ROLE,
        i
      );
      assert.isTrue(
        withdrawalEnablers.map((enabler) => enabler.address).includes(enabler)
      );
    }
  })

  .test("enumerate withdrawal disablers", async (ctx) => {
    const {
      bridgingManagerEnumerable,
      withdrawalDisablers,
      roles: { WITHDRAWALS_DISABLER_ROLE },
    } = ctx;
    const roleCount = (
      await bridgingManagerEnumerable.getRoleMemberCount(
        WITHDRAWALS_DISABLER_ROLE
      )
    ).toNumber();
    assert.equal(roleCount, withdrawalDisablers.length);
    for (let i = 0; i < roleCount; i++) {
      const disabler = await bridgingManagerEnumerable.getRoleMember(
        WITHDRAWALS_DISABLER_ROLE,
        i
      );
      assert.isTrue(
        withdrawalDisablers
          .map((disabler) => disabler.address)
          .includes(disabler)
      );
    }
  })

  .run();

async function ctxFactory() {
  const [
    deployer,
    stranger,
    depositsEnabler,
    depositsEnabler2,
    depositsDisabler,
    depositsDisabler2,
    depositsDisabler3,
    withdrawalsEnabler,
    withdrawalsEnabler2,
    withdrawalsEnabler3,
    withdrawalsDisabler,
    withdrawalsDisabler2,
  ] = await hre.ethers.getSigners();

  const depositEnablers = [depositsEnabler, depositsEnabler2];
  const depositDisablers = [
    depositsDisabler,
    depositsDisabler2,
    depositsDisabler3,
  ];
  const withdrawalEnablers = [
    withdrawalsEnabler,
    withdrawalsEnabler2,
    withdrawalsEnabler3,
  ];
  const withdrawalDisablers = [withdrawalsDisabler, withdrawalsDisabler2];

  const bridgingManagerEnumerableImpl =
    await new BridgingManagerEnumerable__factory(deployer).deploy();
  const pureOssifiableProxy = await new OssifiableProxy__factory(
    deployer
  ).deploy(bridgingManagerEnumerableImpl.address, deployer.address, "0x");
  const initializedOssifiableProxy = await new OssifiableProxy__factory(
    deployer
  ).deploy(bridgingManagerEnumerableImpl.address, deployer.address, "0x");

  const bridgingManagerEnumerable = BridgingManagerEnumerable__factory.connect(
    initializedOssifiableProxy.address,
    deployer
  );
  await bridgingManagerEnumerable.initialize(deployer.address);

  const [
    DEFAULT_ADMIN_ROLE,
    DEPOSITS_ENABLER_ROLE,
    DEPOSITS_DISABLER_ROLE,
    WITHDRAWALS_ENABLER_ROLE,
    WITHDRAWALS_DISABLER_ROLE,
  ] = await Promise.all([
    await bridgingManagerEnumerableImpl.DEFAULT_ADMIN_ROLE(),
    await bridgingManagerEnumerableImpl.DEPOSITS_ENABLER_ROLE(),
    await bridgingManagerEnumerableImpl.DEPOSITS_DISABLER_ROLE(),
    await bridgingManagerEnumerableImpl.WITHDRAWALS_ENABLER_ROLE(),
    await bridgingManagerEnumerableImpl.WITHDRAWALS_DISABLER_ROLE(),
  ]);
  const grantAccessTxs = [
    ...depositEnablers.map(async (depositEnabler) => {
      await bridgingManagerEnumerable.grantRole(
        DEPOSITS_ENABLER_ROLE,
        depositEnabler.address
      );
    }),
    ...depositDisablers.map(async (depositDisabler) => {
      await bridgingManagerEnumerable.grantRole(
        DEPOSITS_DISABLER_ROLE,
        depositDisabler.address
      );
    }),
    ...withdrawalEnablers.map(async (withdrawalEnabler) => {
      await bridgingManagerEnumerable.grantRole(
        WITHDRAWALS_ENABLER_ROLE,
        withdrawalEnabler.address
      );
    }),
    ...withdrawalDisablers.map(async (withdrawalDisabler) => {
      await bridgingManagerEnumerable.grantRole(
        WITHDRAWALS_DISABLER_ROLE,
        withdrawalDisabler.address
      );
    }),
  ];
  await Promise.all(grantAccessTxs);

  return {
    roles: {
      DEFAULT_ADMIN_ROLE,
      DEPOSITS_ENABLER_ROLE,
      DEPOSITS_DISABLER_ROLE,
      WITHDRAWALS_ENABLER_ROLE,
      WITHDRAWALS_DISABLER_ROLE,
    },
    accounts: {
      deployer,
      stranger,
      depositsEnabler,
      depositsDisabler,
      withdrawalsEnabler,
      withdrawalsDisabler,
    },
    bridgingManagerEnumerable,
    bridgingManagerEnumerableRaw: BridgingManagerEnumerable__factory.connect(
      pureOssifiableProxy.address,
      deployer
    ),
    depositEnablers,
    depositDisablers,
    withdrawalEnablers,
    withdrawalDisablers,
  };
}

function accessControlRevertMessage(role: string, address: string) {
  return `AccessControl: account ${address.toLowerCase()} is missing role ${role}`;
}
