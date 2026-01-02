// Deploy script for FunderrFactory - Factory Pattern
// Each campaign gets its own contract address

const hre = require("hardhat");

async function main() {
  console.log("Deploying FunderrFactory contract...");
  console.log("Network:", hre.network.name);
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", balance.toString());
  
  // Deploy FunderrFactory
  const FunderrFactory = await hre.ethers.getContractFactory("FunderrFactory");
  const factory = await FunderrFactory.deploy();
  
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  
  console.log("\n✅ FunderrFactory deployed successfully!");
  console.log("📍 Factory Address:", factoryAddress);
  console.log("🔗 Network:", hre.network.name);
  
  // Get factory info
  const factoryInfo = await factory.getFactoryInfo();
  console.log("\n📋 Factory Details:");
  console.log("- Owner:", factoryInfo[0]);
  console.log("- Platform Wallet:", factoryInfo[1]);
  console.log("- Total Campaigns:", factoryInfo[2].toString());
  console.log("- Paused:", factoryInfo[3]);
  
  console.log("\n🔍 To verify on Etherscan:");
  console.log(`npx hardhat verify --network ${hre.network.name} ${factoryAddress}`);
  
  console.log("\n📝 Update your .env file with:");
  console.log(`FACTORY_ADDRESS=${factoryAddress}`);
  
  console.log("\n🎉 Factory Pattern Deployment Complete!");
  console.log("Each new campaign will get its own contract address.");
  console.log("All campaigns will be visible on Etherscan individually.");
  
  return factoryAddress;
}

main()
  .then((address) => {
    console.log("\nFactory deployed at:", address);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
