const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Funderr Smart Contract", function () {
  let funderr;
  let owner;
  let creator;
  let donor1;
  let donor2;

  const ONE_ETH = ethers.parseEther("1");
  const HALF_ETH = ethers.parseEther("0.5");
  const CAMPAIGN_GOAL = ethers.parseEther("2");
  const CAMPAIGN_DURATION = 30; // 30 days

  beforeEach(async function () {
    [owner, creator, donor1, donor2] = await ethers.getSigners();

    const Funderr = await ethers.getContractFactory("Funderr");
    funderr = await Funderr.deploy();
    await funderr.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await funderr.owner()).to.equal(owner.address);
    });

    it("Should set the platform wallet to owner", async function () {
      expect(await funderr.platformWallet()).to.equal(owner.address);
    });

    it("Should have 2% platform fee by default", async function () {
      expect(await funderr.platformFeePercent()).to.equal(2);
    });

    it("Should start with zero campaigns", async function () {
      expect(await funderr.campaignCount()).to.equal(0);
    });
  });

  describe("Campaign Creation", function () {
    it("Should create a campaign with correct details", async function () {
      const title = "Help Build a School";
      const description = "Building a school in rural area";
      const imageHash = "QmXyz123";

      await expect(
        funderr.connect(creator).createCampaign(title, description, CAMPAIGN_GOAL, CAMPAIGN_DURATION, imageHash)
      ).to.emit(funderr, "CampaignCreated");

      const campaign = await funderr.getCampaign(1);
      expect(campaign.creator).to.equal(creator.address);
      expect(campaign.title).to.equal(title);
      expect(campaign.description).to.equal(description);
      expect(campaign.goal).to.equal(CAMPAIGN_GOAL);
      expect(campaign.active).to.be.true;
      expect(campaign.withdrawn).to.be.false;
    });

    it("Should reject campaign with empty title", async function () {
      await expect(
        funderr.createCampaign("", "Description", CAMPAIGN_GOAL, CAMPAIGN_DURATION, "")
      ).to.be.revertedWith("Title required");
    });

    it("Should reject campaign with zero goal", async function () {
      await expect(
        funderr.createCampaign("Title", "Description", 0, CAMPAIGN_DURATION, "")
      ).to.be.revertedWith("Goal must be greater than 0");
    });

    it("Should reject campaign with invalid duration", async function () {
      await expect(
        funderr.createCampaign("Title", "Description", CAMPAIGN_GOAL, 0, "")
      ).to.be.revertedWith("Duration: 1-365 days");

      await expect(
        funderr.createCampaign("Title", "Description", CAMPAIGN_GOAL, 400, "")
      ).to.be.revertedWith("Duration: 1-365 days");
    });

    it("Should track user campaigns", async function () {
      await funderr.connect(creator).createCampaign("Campaign 1", "Desc", ONE_ETH, 30, "");
      await funderr.connect(creator).createCampaign("Campaign 2", "Desc", ONE_ETH, 30, "");

      const userCampaigns = await funderr.getUserCampaigns(creator.address);
      expect(userCampaigns.length).to.equal(2);
    });
  });

  describe("Donations", function () {
    beforeEach(async function () {
      await funderr.connect(creator).createCampaign("Test Campaign", "Description", CAMPAIGN_GOAL, CAMPAIGN_DURATION, "");
    });

    it("Should accept donations with message", async function () {
      const message = "Good luck with your campaign!";

      const tx = await funderr.connect(donor1).donate(1, message, { value: ONE_ETH });
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx).to.emit(funderr, "DonationReceived")
        .withArgs(1, donor1.address, ONE_ETH, message, block.timestamp);

      const campaign = await funderr.getCampaign(1);
      expect(campaign.raised).to.equal(ONE_ETH);
      expect(campaign.donorCount).to.equal(1);
    });

    it("Should accept simple donations without message", async function () {
      await funderr.connect(donor1).donateSimple(1, { value: ONE_ETH });

      const campaign = await funderr.getCampaign(1);
      expect(campaign.raised).to.equal(ONE_ETH);
    });

    it("Should track multiple donations from same donor", async function () {
      await funderr.connect(donor1).donateSimple(1, { value: HALF_ETH });
      await funderr.connect(donor1).donateSimple(1, { value: HALF_ETH });

      const totalDonation = await funderr.getDonationAmount(1, donor1.address);
      expect(totalDonation).to.equal(ONE_ETH);

      // Donor count should still be 1
      const campaign = await funderr.getCampaign(1);
      expect(campaign.donorCount).to.equal(1);
    });

    it("Should track multiple donors", async function () {
      await funderr.connect(donor1).donateSimple(1, { value: HALF_ETH });
      await funderr.connect(donor2).donateSimple(1, { value: HALF_ETH });

      const campaign = await funderr.getCampaign(1);
      expect(campaign.donorCount).to.equal(2);
      expect(campaign.raised).to.equal(ONE_ETH);
    });

    it("Should reject zero value donations", async function () {
      await expect(
        funderr.connect(donor1).donateSimple(1, { value: 0 })
      ).to.be.revertedWith("Must send ETH to donate");
    });

    it("Should reject donations to inactive campaigns", async function () {
      await funderr.connect(creator).cancelCampaign(1);

      await expect(
        funderr.connect(donor1).donateSimple(1, { value: ONE_ETH })
      ).to.be.revertedWith("Campaign is not active");
    });

    it("Should reject donations after deadline", async function () {
      // Fast forward 31 days
      await time.increase(31 * 24 * 60 * 60);

      await expect(
        funderr.connect(donor1).donateSimple(1, { value: ONE_ETH })
      ).to.be.revertedWith("Campaign has ended");
    });

    it("Should return donation history", async function () {
      await funderr.connect(donor1).donate(1, "First donation", { value: HALF_ETH });
      await funderr.connect(donor2).donate(1, "Second donation", { value: HALF_ETH });

      const donations = await funderr.getCampaignDonations(1);
      expect(donations.length).to.equal(2);
      expect(donations[0].donor).to.equal(donor1.address);
      expect(donations[1].donor).to.equal(donor2.address);
    });
  });

  describe("Withdrawals", function () {
    beforeEach(async function () {
      await funderr.connect(creator).createCampaign("Test Campaign", "Description", CAMPAIGN_GOAL, CAMPAIGN_DURATION, "");
    });

    it("Should allow creator to withdraw when goal is reached", async function () {
      // Donate enough to reach goal
      await funderr.connect(donor1).donateSimple(1, { value: CAMPAIGN_GOAL });

      const creatorBalanceBefore = await ethers.provider.getBalance(creator.address);

      await expect(funderr.connect(creator).withdraw(1))
        .to.emit(funderr, "FundsWithdrawn");

      const creatorBalanceAfter = await ethers.provider.getBalance(creator.address);
      
      // Creator should receive 98% (2% platform fee)
      const expectedAmount = (CAMPAIGN_GOAL * BigInt(98)) / BigInt(100);
      expect(creatorBalanceAfter).to.be.gt(creatorBalanceBefore);

      const campaign = await funderr.getCampaign(1);
      expect(campaign.withdrawn).to.be.true;
    });

    it("Should reject withdrawal if goal not reached", async function () {
      await funderr.connect(donor1).donateSimple(1, { value: HALF_ETH });

      await expect(
        funderr.connect(creator).withdraw(1)
      ).to.be.revertedWith("Funding goal not reached");
    });

    it("Should reject withdrawal by non-creator", async function () {
      await funderr.connect(donor1).donateSimple(1, { value: CAMPAIGN_GOAL });

      await expect(
        funderr.connect(donor1).withdraw(1)
      ).to.be.revertedWith("Not campaign creator");
    });

    it("Should allow withdrawal after deadline even if goal not met", async function () {
      await funderr.connect(donor1).donateSimple(1, { value: HALF_ETH });

      // Fast forward past deadline
      await time.increase(31 * 24 * 60 * 60);

      await expect(funderr.connect(creator).withdrawAfterDeadline(1))
        .to.emit(funderr, "FundsWithdrawn");
    });
  });

  describe("Refunds", function () {
    beforeEach(async function () {
      await funderr.connect(creator).createCampaign("Test Campaign", "Description", CAMPAIGN_GOAL, CAMPAIGN_DURATION, "");
      await funderr.connect(donor1).donateSimple(1, { value: HALF_ETH });
    });

    it("Should allow refund after deadline if goal not reached", async function () {
      // Fast forward past deadline
      await time.increase(31 * 24 * 60 * 60);

      const donorBalanceBefore = await ethers.provider.getBalance(donor1.address);

      await expect(funderr.connect(donor1).claimRefund(1))
        .to.emit(funderr, "RefundClaimed")
        .withArgs(1, donor1.address, HALF_ETH);

      const donorBalanceAfter = await ethers.provider.getBalance(donor1.address);
      expect(donorBalanceAfter).to.be.gt(donorBalanceBefore);
    });

    it("Should reject refund before deadline", async function () {
      await expect(
        funderr.connect(donor1).claimRefund(1)
      ).to.be.revertedWith("Campaign has not ended yet");
    });

    it("Should reject refund if goal was reached", async function () {
      // Complete the funding
      await funderr.connect(donor2).donateSimple(1, { value: ethers.parseEther("1.5") });

      // Fast forward past deadline
      await time.increase(31 * 24 * 60 * 60);

      await expect(
        funderr.connect(donor1).claimRefund(1)
      ).to.be.revertedWith("Goal was reached, no refunds");
    });

    it("Should reject refund for non-donors", async function () {
      await time.increase(31 * 24 * 60 * 60);

      await expect(
        funderr.connect(donor2).claimRefund(1)
      ).to.be.revertedWith("You have no donations to refund");
    });
  });

  describe("Direct ETH Receiving", function () {
    it("Should receive ETH directly via receive()", async function () {
      await expect(
        donor1.sendTransaction({ to: await funderr.getAddress(), value: ONE_ETH })
      ).to.emit(funderr, "DirectDonationReceived")
        .withArgs(donor1.address, ONE_ETH);

      expect(await funderr.getContractBalance()).to.equal(ONE_ETH);
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await funderr.connect(creator).createCampaign("Test Campaign", "Description", CAMPAIGN_GOAL, CAMPAIGN_DURATION, "");
      await funderr.connect(donor1).donateSimple(1, { value: ONE_ETH });
    });

    it("Should return campaign progress percentage", async function () {
      const progress = await funderr.getCampaignProgress(1);
      expect(progress).to.equal(50); // 1 ETH of 2 ETH goal = 50%
    });

    it("Should return time remaining", async function () {
      const timeRemaining = await funderr.getTimeRemaining(1);
      expect(timeRemaining).to.be.gt(0);
    });

    it("Should check if campaign is active", async function () {
      expect(await funderr.isCampaignActive(1)).to.be.true;

      await time.increase(31 * 24 * 60 * 60);
      expect(await funderr.isCampaignActive(1)).to.be.false;
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to change platform fee", async function () {
      await funderr.setPlatformFee(3);
      expect(await funderr.platformFeePercent()).to.equal(3);
    });

    it("Should reject fee above 5%", async function () {
      await expect(funderr.setPlatformFee(6)).to.be.revertedWith("Fee cannot exceed 5%");
    });

    it("Should allow owner to change platform wallet", async function () {
      await funderr.setPlatformWallet(donor1.address);
      expect(await funderr.platformWallet()).to.equal(donor1.address);
    });

    it("Should reject non-owner admin calls", async function () {
      await expect(
        funderr.connect(donor1).setPlatformFee(1)
      ).to.be.revertedWith("Only owner can call this");
    });
  });
});