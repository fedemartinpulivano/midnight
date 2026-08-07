import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying MidnightFactory to ${network.name} as ${deployer.address}`);

  const Factory = await ethers.getContractFactory("MidnightFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  const implementation = await factory.implementation();

  console.log(`MidnightFactory: ${factoryAddress}`);
  console.log(`MidnightVault implementation: ${implementation}`);

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(deploymentsDir, { recursive: true });
  fs.writeFileSync(
    path.join(deploymentsDir, `${network.name}.json`),
    JSON.stringify(
      {
        network: network.name,
        chainId: network.config.chainId ?? 31337,
        factory: factoryAddress,
        implementation,
        deployedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );
  console.log(`Saved deployments/${network.name}.json`);
  // Deliberately not written for you: a bscTestnet deploy would otherwise clobber
  // whatever the frontend is currently pointed at.
  console.log(
    `Next step — put this in web/.env.local:\n  NEXT_PUBLIC_FACTORY_ADDRESS=${factoryAddress}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
