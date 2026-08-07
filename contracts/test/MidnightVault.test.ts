import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import type { MidnightFactory, MidnightVault, MockERC20 } from "../typechain-types";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const DAY = 24 * 60 * 60;
const INACTIVITY = 30 * DAY;
const TTL = 3 * DAY;
const BPS = 10_000n;

describe("Midnight", () => {
  async function deployFixture() {
    const [deployer, owner, g1, g2, g3, h1, h2, outsider, newOwner] =
      await ethers.getSigners();

    const Factory = await ethers.getContractFactory("MidnightFactory");
    const factory = await Factory.deploy();

    const Token = await ethers.getContractFactory("MockERC20");
    const token = await Token.deploy("Mock USD", "mUSD");

    const params = {
      owner: owner.address,
      guardians: [g1.address, g2.address, g3.address],
      threshold: 2n,
      heirs: [h1.address, h2.address],
      shares: [6000, 4000],
      inactivityPeriod: BigInt(INACTIVITY),
      requestTTL: BigInt(TTL),
    };

    const tx = await factory.createVault(params);
    const receipt = await tx.wait();
    const event = receipt!.logs
      .map((log) => {
        try {
          return factory.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((parsed) => parsed?.name === "VaultCreated");
    const vaultAddress = event!.args.vault as string;
    const vault = (await ethers.getContractAt(
      "MidnightVault",
      vaultAddress
    )) as unknown as MidnightVault;

    return {
      deployer, owner, g1, g2, g3, h1, h2, outsider, newOwner,
      factory: factory as unknown as MidnightFactory,
      token: token as unknown as MockERC20,
      vault, params,
    };
  }

  async function fundedFixture() {
    const ctx = await deployFixture();
    await ctx.owner.sendTransaction({
      to: await ctx.vault.getAddress(),
      value: ethers.parseEther("10"),
    });
    return ctx;
  }

  // -------------------------------------------------------------------
  // Factory & initialization
  // -------------------------------------------------------------------

  describe("factory", () => {
    it("registers the vault in every discovery index", async () => {
      const { factory, vault, owner, g1, h2 } = await loadFixture(deployFixture);
      const vaultAddress = await vault.getAddress();

      expect(await factory.vaultsOfOwner(owner.address)).to.deep.equal([vaultAddress]);
      expect(await factory.vaultsOfGuardian(g1.address)).to.deep.equal([vaultAddress]);
      expect(await factory.vaultsOfHeir(h2.address)).to.deep.equal([vaultAddress]);
      expect(await factory.isVault(vaultAddress)).to.equal(true);
      expect(await factory.vaultCount()).to.equal(1n);
    });

    it("clones are independent: two vaults, separate state", async () => {
      const { factory, params, outsider } = await loadFixture(deployFixture);
      const params2 = { ...params, owner: outsider.address };
      await factory.createVault(params2);

      const [v1, v2] = await factory.allVaults();
      expect(v1).to.not.equal(v2);
      const vault2 = await ethers.getContractAt("MidnightVault", v2);
      expect(await vault2.owner()).to.equal(outsider.address);
    });

    it("vault initializes with the configured roles", async () => {
      const { vault, owner, g1, g2, g3, h1, h2 } = await loadFixture(deployFixture);
      expect(await vault.owner()).to.equal(owner.address);
      expect(await vault.getGuardians()).to.deep.equal([g1.address, g2.address, g3.address]);
      expect(await vault.threshold()).to.equal(2n);
      const [heirs, shares] = await vault.getHeirs();
      expect(heirs).to.deep.equal([h1.address, h2.address]);
      expect(shares).to.deep.equal([6000n, 4000n]);
    });

    it("cannot re-initialize a live vault (nor the implementation)", async () => {
      const { vault, factory, params } = await loadFixture(deployFixture);
      await expect(vault.initialize(params)).to.be.revertedWithCustomError(
        vault, "AlreadyInitialized"
      );
      const impl = await ethers.getContractAt("MidnightVault", await factory.implementation());
      await expect(impl.initialize(params)).to.be.revertedWithCustomError(
        impl, "AlreadyInitialized"
      );
    });

    it("rejects invalid configurations", async () => {
      const { factory, params, owner, g1, h1 } = await loadFixture(deployFixture);
      const vaultInterface = (await ethers.getContractFactory("MidnightVault")).interface;

      // threshold above guardian count
      await expect(
        factory.createVault({ ...params, threshold: 4n })
      ).to.be.revertedWithCustomError({ interface: vaultInterface }, "InvalidThreshold");

      // duplicated guardian
      await expect(
        factory.createVault({ ...params, guardians: [g1.address, g1.address] })
      ).to.be.revertedWithCustomError({ interface: vaultInterface }, "DuplicateAddress");

      // owner cannot guard their own vault
      await expect(
        factory.createVault({ ...params, guardians: [owner.address, g1.address] })
      ).to.be.revertedWithCustomError({ interface: vaultInterface }, "RoleConflict");

      // shares must sum to 10000
      await expect(
        factory.createVault({ ...params, heirs: [h1.address], shares: [9999] })
      ).to.be.revertedWithCustomError({ interface: vaultInterface }, "InvalidShares");

      // inactivity below minimum
      await expect(
        factory.createVault({ ...params, inactivityPeriod: 60n })
      ).to.be.revertedWithCustomError({ interface: vaultInterface }, "PeriodOutOfBounds");
    });
  });

  // -------------------------------------------------------------------
  // Deposits & heartbeat
  // -------------------------------------------------------------------

  describe("deposits & proof of life", () => {
    it("accepts native deposits from anyone; owner deposits reset the clock", async () => {
      const { vault, owner, outsider } = await loadFixture(deployFixture);
      const vaultAddress = await vault.getAddress();

      await expect(
        outsider.sendTransaction({ to: vaultAddress, value: ethers.parseEther("1") })
      ).to.emit(vault, "Deposited");

      const before = await vault.lastAlive();
      await time.increase(DAY);
      await owner.sendTransaction({ to: vaultAddress, value: ethers.parseEther("1") });
      expect(await vault.lastAlive()).to.be.greaterThan(before);
    });

    it("outsider deposits do NOT reset the inactivity clock", async () => {
      const { vault, outsider } = await loadFixture(deployFixture);
      const before = await vault.lastAlive();
      await time.increase(DAY);
      await outsider.sendTransaction({
        to: await vault.getAddress(),
        value: ethers.parseEther("1"),
      });
      expect(await vault.lastAlive()).to.equal(before);
    });

    it("heartbeat is a free proof of life, owner only", async () => {
      const { vault, owner, outsider } = await loadFixture(deployFixture);
      const before = await vault.lastAlive();
      await time.increase(DAY);
      await expect(vault.connect(owner).heartbeat()).to.emit(vault, "Heartbeat");
      expect(await vault.lastAlive()).to.be.greaterThan(before);
      await expect(vault.connect(outsider).heartbeat()).to.be.revertedWithCustomError(
        vault, "NotOwner"
      );
    });

    it("pulls ERC20 deposits and tracks the token", async () => {
      const { vault, token, owner } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("500");
      await token.mint(owner.address, amount);
      await token.connect(owner).approve(await vault.getAddress(), amount);

      await expect(vault.connect(owner).depositToken(await token.getAddress(), amount))
        .to.emit(vault, "Deposited");
      expect(await token.balanceOf(await vault.getAddress())).to.equal(amount);
      expect(await vault.getTrackedTokens()).to.deep.equal([await token.getAddress()]);
    });
  });

  // -------------------------------------------------------------------
  // Withdrawals
  // -------------------------------------------------------------------

  describe("withdrawals", () => {
    it("executes automatically at 2-of-3 approvals", async () => {
      const { vault, owner, g1, g2, outsider } = await loadFixture(fundedFixture);
      const amount = ethers.parseEther("2");

      await vault.connect(owner).requestWithdrawal(ethers.ZeroAddress, outsider.address, amount);
      await vault.connect(g1).approveWithdrawal(1);

      // one approval is not enough
      const [reqAfterOne] = await vault.getRequest(1);
      expect(reqAfterOne.status).to.equal(1n); // Pending

      await expect(vault.connect(g2).approveWithdrawal(1)).to.changeEtherBalance(
        outsider, amount
      );
      const [req] = await vault.getRequest(1);
      expect(req.status).to.equal(2n); // Executed
    });

    it("one rejection cannot veto a 2-of-3 vault; two rejections kill the request", async () => {
      const { vault, owner, g1, g2, g3, outsider } = await loadFixture(fundedFixture);
      await vault.connect(owner).requestWithdrawal(
        ethers.ZeroAddress, outsider.address, ethers.parseEther("1")
      );

      await vault.connect(g1).rejectWithdrawal(1);
      let [req] = await vault.getRequest(1);
      expect(req.status).to.equal(1n); // still Pending — improvement over Vaultix

      await vault.connect(g2).rejectWithdrawal(1);
      [req] = await vault.getRequest(1);
      expect(req.status).to.equal(4n); // Rejected — can no longer reach threshold

      await expect(vault.connect(g3).approveWithdrawal(1)).to.be.revertedWithCustomError(
        vault, "RequestNotPending"
      );
    });

    it("owner can cancel their own pending request", async () => {
      const { vault, owner, g1, outsider } = await loadFixture(fundedFixture);
      await vault.connect(owner).requestWithdrawal(
        ethers.ZeroAddress, outsider.address, ethers.parseEther("1")
      );
      await expect(vault.connect(owner).cancelWithdrawal(1)).to.emit(vault, "WithdrawalCancelled");
      await expect(vault.connect(g1).approveWithdrawal(1)).to.be.revertedWithCustomError(
        vault, "RequestNotPending"
      );
    });

    it("supports multiple concurrent requests", async () => {
      const { vault, owner, g1, g2, outsider } = await loadFixture(fundedFixture);
      await vault.connect(owner).requestWithdrawal(
        ethers.ZeroAddress, outsider.address, ethers.parseEther("1")
      );
      await vault.connect(owner).requestWithdrawal(
        ethers.ZeroAddress, outsider.address, ethers.parseEther("2")
      );

      await vault.connect(g1).approveWithdrawal(2);
      await expect(vault.connect(g2).approveWithdrawal(2)).to.changeEtherBalance(
        outsider, ethers.parseEther("2")
      );
      const [first] = await vault.getRequest(1);
      expect(first.status).to.equal(1n); // untouched
    });

    it("requests expire after the TTL", async () => {
      const { vault, owner, g1, outsider } = await loadFixture(fundedFixture);
      await vault.connect(owner).requestWithdrawal(
        ethers.ZeroAddress, outsider.address, ethers.parseEther("1")
      );
      await time.increase(TTL + 1);
      await expect(vault.connect(g1).approveWithdrawal(1)).to.be.revertedWithCustomError(
        vault, "RequestExpired"
      );
      const [, , expired] = await vault.getRequest(1);
      expect(expired).to.equal(true);
    });

    it("guardians vote once; outsiders cannot vote; owner cannot approve", async () => {
      const { vault, owner, g1, outsider } = await loadFixture(fundedFixture);
      await vault.connect(owner).requestWithdrawal(
        ethers.ZeroAddress, outsider.address, ethers.parseEther("1")
      );
      await vault.connect(g1).approveWithdrawal(1);
      await expect(vault.connect(g1).approveWithdrawal(1)).to.be.revertedWithCustomError(
        vault, "AlreadyVoted"
      );
      await expect(vault.connect(outsider).approveWithdrawal(1)).to.be.revertedWithCustomError(
        vault, "NotGuardian"
      );
      await expect(vault.connect(owner).approveWithdrawal(1)).to.be.revertedWithCustomError(
        vault, "NotGuardian"
      );
    });

    it("handles ERC20 withdrawals through the same flow", async () => {
      const { vault, token, owner, g1, g2, outsider } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("100");
      await token.mint(owner.address, amount);
      await token.connect(owner).approve(await vault.getAddress(), amount);
      await vault.connect(owner).depositToken(await token.getAddress(), amount);

      await vault.connect(owner).requestWithdrawal(
        await token.getAddress(), outsider.address, amount
      );
      await vault.connect(g1).approveWithdrawal(1);
      await vault.connect(g2).approveWithdrawal(1);
      expect(await token.balanceOf(outsider.address)).to.equal(amount);
    });

    it("rejects requests above the available balance", async () => {
      const { vault, owner, outsider } = await loadFixture(fundedFixture);
      await expect(
        vault.connect(owner).requestWithdrawal(
          ethers.ZeroAddress, outsider.address, ethers.parseEther("999")
        )
      ).to.be.revertedWithCustomError(vault, "InsufficientBalance");
    });
  });

  // -------------------------------------------------------------------
  // Inheritance
  // -------------------------------------------------------------------

  describe("inheritance", () => {
    it("is locked while the owner is alive", async () => {
      const { vault, h1 } = await loadFixture(fundedFixture);
      await expect(vault.connect(h1).claimInheritance(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(vault, "StillActive");
    });

    it("heartbeat pushes the unlock date forward", async () => {
      const { vault, owner, h1 } = await loadFixture(fundedFixture);
      await time.increase(INACTIVITY - DAY);
      await vault.connect(owner).heartbeat();
      await time.increase(2 * DAY); // total > INACTIVITY from vault creation
      await expect(vault.connect(h1).claimInheritance(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(vault, "StillActive");
    });

    it("splits native funds 60/40 after inactivity", async () => {
      const { vault, h1, h2 } = await loadFixture(fundedFixture);
      await time.increase(INACTIVITY + 1);

      await expect(vault.connect(h1).claimInheritance(ethers.ZeroAddress))
        .to.changeEtherBalance(h1, ethers.parseEther("6"));
      await expect(vault.connect(h2).claimInheritance(ethers.ZeroAddress))
        .to.changeEtherBalance(h2, ethers.parseEther("4"));
    });

    it("dividend accounting: deposits after the first claim are still split correctly", async () => {
      const { vault, h1, h2, outsider } = await loadFixture(fundedFixture);
      await time.increase(INACTIVITY + 1);

      // h1 claims 60% of 10 = 6
      await vault.connect(h1).claimInheritance(ethers.ZeroAddress);

      // 10 more arrive late (e.g. a pending payment)
      await outsider.sendTransaction({
        to: await vault.getAddress(), value: ethers.parseEther("10"),
      });

      // totals: 20 ever → h2 entitled 8, h1 entitled 12 - 6 already = 6
      await expect(vault.connect(h2).claimInheritance(ethers.ZeroAddress))
        .to.changeEtherBalance(h2, ethers.parseEther("8"));
      await expect(vault.connect(h1).claimInheritance(ethers.ZeroAddress))
        .to.changeEtherBalance(h1, ethers.parseEther("6"));
    });

    it("double claim without new deposits reverts with NothingToClaim", async () => {
      const { vault, h1 } = await loadFixture(fundedFixture);
      await time.increase(INACTIVITY + 1);
      await vault.connect(h1).claimInheritance(ethers.ZeroAddress);
      await expect(vault.connect(h1).claimInheritance(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(vault, "NothingToClaim");
    });

    it("claimAllInheritance sweeps native + tracked ERC20 in one call", async () => {
      const { vault, token, owner, h1 } = await loadFixture(fundedFixture);
      const tokenAmount = ethers.parseEther("1000");
      await token.mint(owner.address, tokenAmount);
      await token.connect(owner).approve(await vault.getAddress(), tokenAmount);
      await vault.connect(owner).depositToken(await token.getAddress(), tokenAmount);

      await time.increase(INACTIVITY + 1);

      await expect(vault.connect(h1).claimAllInheritance())
        .to.changeEtherBalance(h1, ethers.parseEther("6"));
      expect(await token.balanceOf(h1.address)).to.equal(ethers.parseEther("600"));
    });

    it("only heirs can claim", async () => {
      const { vault, outsider, g1 } = await loadFixture(fundedFixture);
      await time.increase(INACTIVITY + 1);
      await expect(vault.connect(outsider).claimInheritance(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(vault, "NotHeir");
      await expect(vault.connect(g1).claimInheritance(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(vault, "NotHeir");
    });

    it("claimableInheritance view matches actual payouts", async () => {
      const { vault, h1, h2 } = await loadFixture(fundedFixture);
      expect(await vault.claimableInheritance(h1.address, ethers.ZeroAddress)).to.equal(0n);
      await time.increase(INACTIVITY + 1);
      expect(await vault.claimableInheritance(h1.address, ethers.ZeroAddress))
        .to.equal(ethers.parseEther("6"));
      expect(await vault.claimableInheritance(h2.address, ethers.ZeroAddress))
        .to.equal(ethers.parseEther("4"));
    });
  });

  // -------------------------------------------------------------------
  // Social recovery
  // -------------------------------------------------------------------

  describe("social recovery", () => {
    it("guardians rotate a lost owner key after threshold + timelock", async () => {
      const { vault, g1, g2, newOwner } = await loadFixture(fundedFixture);

      await vault.connect(g1).proposeRecovery(newOwner.address); // auto-approves
      await vault.connect(g2).approveRecovery(1);

      await expect(vault.executeRecovery(1)).to.be.revertedWithCustomError(
        vault, "TimelockNotElapsed"
      );
      await time.increase(2 * DAY + 1);
      await expect(vault.executeRecovery(1)).to.emit(vault, "RecoveryExecuted");
      expect(await vault.owner()).to.equal(newOwner.address);
    });

    it("cannot execute below threshold", async () => {
      const { vault, g1, newOwner } = await loadFixture(fundedFixture);
      await vault.connect(g1).proposeRecovery(newOwner.address);
      await time.increase(2 * DAY + 1);
      await expect(vault.executeRecovery(1)).to.be.revertedWithCustomError(
        vault, "ThresholdNotReached"
      );
    });

    it("the real owner can veto during the timelock", async () => {
      const { vault, owner, g1, g2, newOwner } = await loadFixture(fundedFixture);
      await vault.connect(g1).proposeRecovery(newOwner.address);
      await vault.connect(g2).approveRecovery(1);
      await vault.connect(owner).vetoRecovery(1);
      await time.increase(2 * DAY + 1);
      await expect(vault.executeRecovery(1)).to.be.revertedWithCustomError(
        vault, "RecoveryClosed"
      );
    });

    it("rotation invalidates pending withdrawal requests from the old key", async () => {
      const { vault, owner, g1, g2, outsider, newOwner } = await loadFixture(fundedFixture);
      await vault.connect(owner).requestWithdrawal(
        ethers.ZeroAddress, outsider.address, ethers.parseEther("5")
      );

      await vault.connect(g1).proposeRecovery(newOwner.address);
      await vault.connect(g2).approveRecovery(1);
      await time.increase(2 * DAY + 1);
      await vault.executeRecovery(1);

      await expect(vault.connect(g1).approveWithdrawal(1)).to.be.revertedWithCustomError(
        vault, "StaleRequest"
      );
      // and the new owner operates normally
      await vault.connect(newOwner).requestWithdrawal(
        ethers.ZeroAddress, outsider.address, ethers.parseEther("1")
      );
    });

    it("recovery target cannot be a guardian or heir", async () => {
      const { vault, g1, g2, h1 } = await loadFixture(fundedFixture);
      await expect(vault.connect(g1).proposeRecovery(g2.address))
        .to.be.revertedWithCustomError(vault, "RoleConflict");
      await expect(vault.connect(g1).proposeRecovery(h1.address))
        .to.be.revertedWithCustomError(vault, "RoleConflict");
    });
  });

  // -------------------------------------------------------------------
  // Config changes
  // -------------------------------------------------------------------

  describe("config changes", () => {
    it("owner proposal applies only after the timelock", async () => {
      const { vault, owner, g1, g2, h1, h2, outsider } = await loadFixture(fundedFixture);

      await vault.connect(owner).proposeConfig(
        [g1.address, g2.address, outsider.address], 3,
        [h1.address, h2.address], [5000, 5000],
        60 * DAY, 5 * DAY
      );

      await expect(vault.applyConfig()).to.be.revertedWithCustomError(
        vault, "TimelockNotElapsed"
      );

      await time.increase(2 * DAY + 1);
      await expect(vault.applyConfig()).to.emit(vault, "ConfigApplied");

      expect(await vault.threshold()).to.equal(3n);
      expect(await vault.isGuardian(outsider.address)).to.equal(true);
      const [, shares] = await vault.getHeirs();
      expect(shares).to.deep.equal([5000n, 5000n]);
      expect(await vault.inactivityPeriod()).to.equal(BigInt(60 * DAY));
    });

    it("threshold guardians can veto a malicious config", async () => {
      const { vault, owner, g1, g2, outsider, h1 } = await loadFixture(fundedFixture);

      // compromised key tries to swap everyone for the attacker
      await vault.connect(owner).proposeConfig(
        [outsider.address], 1, [h1.address], [10000], 30 * DAY, 3 * DAY
      );

      await vault.connect(g1).vetoConfig();
      await expect(vault.connect(g2).vetoConfig()).to.emit(vault, "ConfigCancelled");

      await time.increase(2 * DAY + 1);
      await expect(vault.applyConfig()).to.be.revertedWithCustomError(
        vault, "NoPendingConfig"
      );
    });

    it("applying a config invalidates requests approved by the old guardian set", async () => {
      const { vault, owner, g1, g2, g3, h1, h2, outsider } = await loadFixture(fundedFixture);
      await vault.connect(owner).requestWithdrawal(
        ethers.ZeroAddress, outsider.address, ethers.parseEther("1")
      );
      await vault.connect(g1).approveWithdrawal(1);

      await vault.connect(owner).proposeConfig(
        [g1.address, g2.address, g3.address], 2,
        [h1.address, h2.address], [6000, 4000],
        45 * DAY, 3 * DAY
      );
      await time.increase(2 * DAY + 1);
      await vault.applyConfig();

      await expect(vault.connect(g2).approveWithdrawal(1)).to.be.revertedWithCustomError(
        vault, "StaleRequest"
      );
    });

    it("only one pending config at a time; owner can cancel", async () => {
      const { vault, owner, g1, g2, g3, h1, h2 } = await loadFixture(fundedFixture);
      const propose = () =>
        vault.connect(owner).proposeConfig(
          [g1.address, g2.address, g3.address], 2,
          [h1.address, h2.address], [6000, 4000],
          45 * DAY, 3 * DAY
        );

      await propose();
      await expect(propose()).to.be.revertedWithCustomError(vault, "ConfigAlreadyPending");
      await vault.connect(owner).cancelConfig();
      await propose(); // works again
    });
  });

  // -------------------------------------------------------------------
  // Summary view
  // -------------------------------------------------------------------

  describe("summary", () => {
    it("returns the aggregated vault state for the frontend", async () => {
      const { vault, owner, g1 } = await loadFixture(fundedFixture);
      const s = await vault.summary();
      expect(s.owner).to.equal(owner.address);
      expect(s.guardians).to.include(g1.address);
      expect(s.threshold).to.equal(2n);
      expect(s.nativeBalance).to.equal(ethers.parseEther("10"));
      expect(s.inheritanceUnlocked).to.equal(false);
      expect(s.hasPendingConfig).to.equal(false);
    });
  });
});
