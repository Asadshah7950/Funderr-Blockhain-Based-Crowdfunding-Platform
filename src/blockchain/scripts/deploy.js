const hre = require("hardhat");

async function main() {
  console.log("Deploying Funderr contract...");
  console.log("Network:", hre.network.name);

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Deploy the contract
  const Funderr = await hre.ethers.deployContract("Funderr");
  await Funderr.waitForDeployment();

  const contractAddress = await Funderr.getAddress();
  console.log("\n✅ Funderr deployed successfully!");
  console.log("📍 Contract Address:", contractAddress);
  console.log("🔗 Network:", hre.network.name);

  // Verify the deployment
  console.log("\n📋 Contract Details:");
  console.log("- Owner:", await Funderr.owner());
  console.log("- Platform Wallet:", await Funderr.platformWallet());
  console.log("- Platform Fee:", (await Funderr.platformFeePercent()).toString() + "%");
  console.log("- Total Campaigns:", (await Funderr.campaignCount()).toString());

  // If on testnet, provide verification command
  if (hre.network.name === "sepolia") {
    console.log("\n🔍 To verify on Etherscan:");
    console.log(`npx hardhat verify --network sepolia ${contractAddress}`);
  }

  return contractAddress;
}

main()
  .then((address) => {
    console.log("\n🎉 Deployment complete! Contract at:", address);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });

