import hre from "hardhat";
import { assert, expect } from "chai";
import { ethers, BigNumber } from "ethers";

import { domainSeparator } from "../utils/eip712";
import {
  ERC1271WalletStub__factory,
  ERC20BridgedPermit__factory,
  OssifiableProxy__factory,
} from "../../typechain";

const INITIAL_BALANCE = ethers.utils.parseEther("10");

const types: Record<string, ethers.TypedDataField[]> = {
  Permit: [
    { name: "owner", type: "address" },
    { name: "spender", type: "address" },
    { name: "value", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};

describe("ERC20BridgedPermit1", async () => {
  async function setup() {
    const name = "ERC20 Test Token";
    const symbol = "ERC20";
    const decimals = 18;
    const version = "1";
    const [deployer, governor, initialHolder, spender, erc1271WalletOwner] =
      await hre.ethers.getSigners();
    const chainId = (await hre.ethers.provider.getNetwork()).chainId;

    const l2TokenImpl = await new ERC20BridgedPermit__factory(deployer).deploy(
      // name,
      // symbol,
      // decimals,
      // deployer.address
    );

    const l2TokensProxy = await new OssifiableProxy__factory(deployer).deploy(
      l2TokenImpl.address,
      deployer.address,
      ERC20BridgedPermit__factory.createInterface().encodeFunctionData(
        "initialize",
        [name, symbol, decimals, deployer.address]
      )
    );

    const erc20Bridged = ERC20BridgedPermit__factory.connect(
      l2TokensProxy.address,
      deployer
    );

    const erc1271WalletContract = await new ERC1271WalletStub__factory(
      deployer
    ).deploy(erc1271WalletOwner.address);

    // mint initial balance to initialHolder wallet
    await (
      await erc20Bridged.bridgeMint(initialHolder.address, INITIAL_BALANCE)
    ).wait();

    // mint initial balance to smart contract wallet
    await (
      await erc20Bridged.bridgeMint(
        erc1271WalletContract.address,
        INITIAL_BALANCE
      )
    ).wait();

    return {
      accounts: {
        deployerWallet: deployer,
        governor,
        initialHolder,
        spender,
        erc1271WalletOwner,
      },
      erc20Bridged,
      erc1271Wallet: erc1271WalletContract,
      domain: {
        name: name,
        version: version,
        chainId: chainId,
        verifyingContract: erc20Bridged.address,
      },
      gasLimit: 10_000_000,
    };
  }

  let context: Awaited<ReturnType<typeof setup>>;

  before("Setting up the context", async () => {
    context = await setup();
  });

  it("nonces() :: initial nonce is 0", async () => {
    const {
      accounts: { initialHolder },
      erc20Bridged,
    } = context;
    assert.deepEqual(
      await erc20Bridged.nonces(initialHolder.address),
      ethers.utils.parseEther("0")
    );
  });

  it("DOMAIN_SEPARATOR()", async () => {
    const {
      erc20Bridged,
      domain: { name, chainId, version },
    } = context;
    assert.equal(
      await erc20Bridged.DOMAIN_SEPARATOR(),
      domainSeparator(name, version, chainId, erc20Bridged.address)
    );
  });

  it("permit() :: EOA :: works as expected", async () => {
    const {
      accounts: { initialHolder, spender },
      erc20Bridged,
      domain,
    } = context;

    const ownerAddr = initialHolder.address;
    const spenderAddrs = spender.address;
    const amount = ethers.utils.parseEther("1");
    const ownerNonce = 0;
    const deadline = ethers.constants.MaxUint256;

    const value = {
      owner: ownerAddr,
      spender: spenderAddrs,
      value: amount,
      nonce: ownerNonce,
      deadline,
    };

    const signature = await initialHolder._signTypedData(domain, types, value);
    const r = signature.slice(0, 66);
    const s = "0x" + signature.slice(66, 130);
    const v = "0x" + signature.slice(130, 132);

    const permitTx = await erc20Bridged.permit(
      ownerAddr,
      spenderAddrs,
      amount,
      deadline,
      v,
      r,
      s
    );
    await permitTx.wait();

    assert.deepEqual(
      await erc20Bridged.nonces(ownerAddr),
      BigNumber.from(1),
      "Incorrect owner nonce"
    );

    assert.deepEqual(
      await erc20Bridged.allowance(ownerAddr, spenderAddrs),
      amount,
      "Incorrect spender allowance"
    );
  });

  it("permit() :: EOA :: rejects reused signature", async () => {
    const {
      accounts: { initialHolder, spender },
      erc20Bridged,
      domain,
    } = context;

    const ownerAddr = initialHolder.address;
    const spenderAddrs = spender.address;
    const amount = ethers.utils.parseEther("1");
    const ownerNonce = 0;
    const deadline = ethers.constants.MaxUint256;

    const value = {
      owner: ownerAddr,
      spender: spenderAddrs,
      value: amount,
      nonce: ownerNonce,
      deadline,
    };

    const signature = await initialHolder._signTypedData(domain, types, value);
    const r = signature.slice(0, 66);
    const s = "0x" + signature.slice(66, 130);
    const v = "0x" + signature.slice(130, 132);

    await expect(
      erc20Bridged.permit(ownerAddr, spenderAddrs, amount, deadline, v, r, s)
    ).to.be.revertedWith("InvalidSignature");
  });

  it("permit() :: EOA :: rejects invalid signer", async () => {
    const {
      accounts: { initialHolder, spender, deployerWallet: invalidSigner },
      erc20Bridged,
      domain,
    } = context;

    const ownerAddr = initialHolder.address;
    const spenderAddrs = spender.address;
    const amount = ethers.utils.parseEther("1");
    const ownerNonce = 1;
    const deadline = ethers.constants.MaxUint256;

    const value = {
      owner: ownerAddr,
      spender: spenderAddrs,
      value: amount,
      nonce: ownerNonce,
      deadline,
    };

    const signature = await invalidSigner._signTypedData(domain, types, value);
    const r = signature.slice(0, 66);
    const s = "0x" + signature.slice(66, 130);
    const v = "0x" + signature.slice(130, 132);

    await expect(
      erc20Bridged.permit(ownerAddr, spenderAddrs, amount, deadline, v, r, s)
    ).to.be.revertedWith("InvalidSignature");
  });

  it("permit() :: EOA :: rejects expired permit deadline", async () => {
    const {
      accounts: { initialHolder, spender },
      erc20Bridged,
      domain,
    } = context;

    const ownerAddr = initialHolder.address;
    const spenderAddrs = spender.address;
    const amount = ethers.utils.parseEther("1");
    const ownerNonce = 1;
    const deadline = Math.floor(Date.now() / 1000) - 604_800; // 1 week = 604_800 s

    const value = {
      owner: ownerAddr,
      spender: spenderAddrs,
      value: amount,
      nonce: ownerNonce,
      deadline,
    };

    const signature = await initialHolder._signTypedData(domain, types, value);
    const r = signature.slice(0, 66);
    const s = "0x" + signature.slice(66, 130);
    const v = "0x" + signature.slice(130, 132);

    await expect(
      erc20Bridged.permit(ownerAddr, spenderAddrs, amount, deadline, v, r, s)
    ).to.be.revertedWith("ERC2612ExpiredSignature");
  });

  it("permit() :: ERC1271Wallet :: works as expected", async () => {
    const {
      accounts: { spender, erc1271WalletOwner },
      erc20Bridged,
      erc1271Wallet,
      domain,
    } = context;

    const ownerAddr = erc1271Wallet.address;
    const spenderAddrs = spender.address;
    const amount = ethers.utils.parseEther("1");
    const ownerNonce = 0;
    const deadline = ethers.constants.MaxUint256;

    const value = {
      owner: ownerAddr,
      spender: spenderAddrs,
      value: amount,
      nonce: ownerNonce,
      deadline,
    };

    const signature = await erc1271WalletOwner._signTypedData(
      domain,
      types,
      value
    );
    const r = signature.slice(0, 66);
    const s = "0x" + signature.slice(66, 130);
    const v = "0x" + signature.slice(130, 132);

    const permitTx = await erc20Bridged.permit(
      ownerAddr,
      spenderAddrs,
      amount,
      deadline,
      v,
      r,
      s
    );
    await permitTx.wait();

    assert.deepEqual(
      await erc20Bridged.nonces(ownerAddr),
      BigNumber.from(1),
      "Incorrect owner nonce"
    );

    assert.deepEqual(
      await erc20Bridged.allowance(ownerAddr, spenderAddrs),
      amount,
      "Incorrect spender allowance"
    );
  });

  it("permit() :: ERC1271Wallet :: rejects reused signature", async () => {
    const {
      accounts: { spender, erc1271WalletOwner },
      erc20Bridged,
      erc1271Wallet,
      domain,
    } = context;

    const ownerAddr = erc1271Wallet.address;
    const spenderAddrs = spender.address;
    const amount = ethers.utils.parseEther("1");
    const ownerNonce = 0;
    const deadline = ethers.constants.MaxUint256;

    const value = {
      owner: ownerAddr,
      spender: spenderAddrs,
      value: amount,
      nonce: ownerNonce,
      deadline,
    };

    const signature = await erc1271WalletOwner._signTypedData(
      domain,
      types,
      value
    );
    const r = signature.slice(0, 66);
    const s = "0x" + signature.slice(66, 130);
    const v = "0x" + signature.slice(130, 132);

    await expect(
      erc20Bridged.permit(ownerAddr, spenderAddrs, amount, deadline, v, r, s)
    ).to.be.revertedWith("InvalidSignature");
  });

  it("permit() :: ERC1271Wallet :: rejects invalid signer", async () => {
    const {
      accounts: { spender, deployerWallet: invalidSigner },
      erc20Bridged,
      erc1271Wallet,
      domain,
    } = context;

    const ownerAddr = erc1271Wallet.address;
    const spenderAddrs = spender.address;
    const amount = ethers.utils.parseEther("1");
    const ownerNonce = 1;
    const deadline = ethers.constants.MaxUint256;

    const value = {
      owner: ownerAddr,
      spender: spenderAddrs,
      value: amount,
      nonce: ownerNonce,
      deadline,
    };

    const signature = await invalidSigner._signTypedData(domain, types, value);
    const r = signature.slice(0, 66);
    const s = "0x" + signature.slice(66, 130);
    const v = "0x" + signature.slice(130, 132);

    await expect(
      erc20Bridged.permit(ownerAddr, spenderAddrs, amount, deadline, v, r, s)
    ).to.be.revertedWith("InvalidSignature");
  });

  it("permit() :: ERC1271Wallet :: rejects expired permit deadline", async () => {
    const {
      accounts: { spender, erc1271WalletOwner },
      erc20Bridged,
      erc1271Wallet,
      domain,
    } = context;

    const ownerAddr = erc1271Wallet.address;
    const spenderAddrs = spender.address;
    const amount = ethers.utils.parseEther("1");
    const ownerNonce = 1;
    const deadline = Math.floor(Date.now() / 1000) - 604_800; // 1 week = 604_800 s

    const value = {
      owner: ownerAddr,
      spender: spenderAddrs,
      value: amount,
      nonce: ownerNonce,
      deadline,
    };

    const signature = await erc1271WalletOwner._signTypedData(
      domain,
      types,
      value
    );
    const r = signature.slice(0, 66);
    const s = "0x" + signature.slice(66, 130);
    const v = "0x" + signature.slice(130, 132);

    await expect(
      erc20Bridged.permit(ownerAddr, spenderAddrs, amount, deadline, v, r, s)
    ).to.be.revertedWith("ERC2612ExpiredSignature");
  });
});
