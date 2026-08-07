// Seeds the local hardhat node with a demo vault so the UI has something to show.
// Run against a live node:  npx hardhat run scripts/demo-local.ts --network localhost
import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const DAY = 24n * 60n * 60n;

async function main() {
  const [owner, g1, g2, g3, h1, h2] = await ethers.getSigners();

  const deploymentPath = path.join(__dirname, "..", "deployments", "localhost.json");
  const { factory: factoryAddress } = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const factory = await ethers.getContractAt("MidnightFactory", factoryAddress);

  const tx = await factory.createVault({
    owner: owner.address,
    guardians: [g1.address, g2.address, g3.address],
    threshold: 2n,
    heirs: [h1.address, h2.address],
    shares: [6000, 4000],
    inactivityPeriod: 30n * DAY,
    requestTTL: 3n * DAY,
  });
  await tx.wait();

  const [vaultAddress] = await factory.vaultsOfOwner(owner.address);
  const vault = await ethers.getContractAt("MidnightVault", vaultAddress);

  await (await owner.sendTransaction({ to: vaultAddress, value: ethers.parseEther("5") })).wait();

  const summary = await vault.summary();
  console.log("Demo vault ready");
  console.log(`  vault:     ${vaultAddress}`);
  console.log(`  owner:     ${owner.address}  (hardhat account #0)`);
  console.log(`  guardians: ${[g1.address, g2.address, g3.address].join(", ")}  (accounts #1-#3, threshold 2)`);
  console.log(`  heirs:     ${h1.address} 60% / ${h2.address} 40%  (accounts #4-#5)`);
  console.log(`  balance:   ${ethers.formatEther(summary.nativeBalance)} ETH`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
