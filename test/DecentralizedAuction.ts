import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { DecentralizedAuction } from "../typechain-types";
import { MockERC20 } from "../typechain-types";

describe("DecentralizedAuction", function () {
  // Fixture untuk deploy kontrak
  async function deployAuctionFixture() {
    const [owner, creator, bidder1, bidder2] = await ethers.getSigners();

    // Deploy mock ERC20 token untuk testing
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20Factory.deploy("Mock Token", "MTK", 18);

    // Mint token untuk bidder
    await mockToken.mint(bidder1.address, ethers.parseEther("1000"));
    await mockToken.mint(bidder2.address, ethers.parseEther("1000"));

    // Deploy auction contract
    const AuctionFactory = await ethers.getContractFactory("DecentralizedAuction");
    const auction = await AuctionFactory.deploy(owner.address);

    return { auction, mockToken, owner, creator, bidder1, bidder2 };
  }

  describe("Deployment", function () {
    it("Should set the right platform fee address", async function () {
      const { auction, owner } = await loadFixture(deployAuctionFixture);
      expect(await auction.platformFeeAddress()).to.equal(owner.address);
    });

    it("Should set the platform fee to 2.5%", async function () {
      const { auction } = await loadFixture(deployAuctionFixture);
      expect(await auction.PLATFORM_FEE_BASIS_POINTS()).to.equal(250);
    });
  });

  describe("Create Auction", function () {
    it("Should create a new auction with native token", async function () {
      const { auction, creator } = await loadFixture(deployAuctionFixture);

      const tx = await auction.connect(creator).createAuction(
        "Test Auction",
        "Test Description",
        "QmTest123",
        ethers.parseEther("1"),
        24, // 24 jam
        false, // native token
        ethers.ZeroAddress
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          return auction.interface.parseLog(log)?.name === "AuctionCreated";
        } catch (e) {
          return false;
        }
      });

      expect(event).to.not.be.undefined;
      const parsedEvent = auction.interface.parseLog(event);
      expect(parsedEvent?.args.auctionId).to.equal(1);
      expect(parsedEvent?.args.creator).to.equal(creator.address);
      expect(parsedEvent?.args.title).to.equal("Test Auction");
      expect(parsedEvent?.args.isERC20).to.equal(false);
    });

    it("Should create a new auction with ERC20 token", async function () {
      const { auction, creator, mockToken } = await loadFixture(deployAuctionFixture);

      const tx = await auction.connect(creator).createAuction(
        "ERC20 Auction",
        "Test with ERC20",
        "QmTest456",
        ethers.parseEther("10"),
        48, // 48 jam
        true, // ERC20 token
        mockToken.target
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          return auction.interface.parseLog(log)?.name === "AuctionCreated";
        } catch (e) {
          return false;
        }
      });

      expect(event).to.not.be.undefined;
      const parsedEvent = auction.interface.parseLog(event);
      expect(parsedEvent?.args.auctionId).to.equal(1);
      expect(parsedEvent?.args.isERC20).to.equal(true);
      expect(parsedEvent?.args.tokenAddress).to.equal(mockToken.target);
    });

    it("Should fail if creating ERC20 auction without token address", async function () {
      const { auction, creator } = await loadFixture(deployAuctionFixture);

      await expect(auction.connect(creator).createAuction(
        "Invalid Auction",
        "Missing token address",
        "QmTest789",
        ethers.parseEther("5"),
        24,
        true, // ERC20 token
        ethers.ZeroAddress // Invalid zero address
      )).to.be.revertedWith("Token address cannot be zero address");
    });
  });

  describe("Bidding", function () {
    it("Should place a bid with native token", async function () {
      const { auction, creator, bidder1 } = await loadFixture(deployAuctionFixture);

      // Create auction
      await auction.connect(creator).createAuction(
        "Native Auction",
        "Test Description",
        "QmTest123",
        ethers.parseEther("1"),
        24,
        false,
        ethers.ZeroAddress
      );

      // Place bid
      const bidAmount = ethers.parseEther("2");
      const tx = await auction.connect(bidder1).bid(1, 0, { value: bidAmount });

      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          return auction.interface.parseLog(log)?.name === "NewBid";
        } catch (e) {
          return false;
        }
      });

      expect(event).to.not.be.undefined;
      const parsedEvent = auction.interface.parseLog(event);
      expect(parsedEvent?.args.auctionId).to.equal(1);
      expect(parsedEvent?.args.bidder).to.equal(bidder1.address);
      expect(parsedEvent?.args.amount).to.equal(bidAmount);

      // Check highest bid
      const [highestBidder, highestBid] = await auction.getCurrentHighestBid(1);
      expect(highestBidder).to.equal(bidder1.address);
      expect(highestBid).to.equal(bidAmount);
    });

    it("Should place a bid with ERC20 token", async function () {
      const { auction, creator, bidder1, mockToken } = await loadFixture(deployAuctionFixture);

      // Create auction
      await auction.connect(creator).createAuction(
        "ERC20 Auction",
        "Test with ERC20",
        "QmTest456",
        ethers.parseEther("10"),
        48,
        true,
        mockToken.target
      );

      // Approve token transfer
      const bidAmount = ethers.parseEther("20");
      await mockToken.connect(bidder1).approve(auction.target, bidAmount);

      // Place bid
      const tx = await auction.connect(bidder1).bid(1, bidAmount);

      const receipt = await tx.wait();
      const event = receipt?.logs.find(log => {
        try {
          return auction.interface.parseLog(log)?.name === "NewBid";
        } catch (e) {
          return false;
        }
      });

      expect(event).to.not.be.undefined;
      const parsedEvent = auction.interface.parseLog(event);
      expect(parsedEvent?.args.auctionId).to.equal(1);
      expect(parsedEvent?.args.bidder).to.equal(bidder1.address);
      expect(parsedEvent?.args.amount).to.equal(bidAmount);
    });

    it("Should refund previous bidder when new bid is placed", async function () {
      const { auction, creator, bidder1, bidder2 } = await loadFixture(deployAuctionFixture);

      // Create auction
      await auction.connect(creator).createAuction(
        "Native Auction",
        "Test Description",
        "QmTest123",
        ethers.parseEther("1"),
        24,
        false,
        ethers.ZeroAddress
      );

      // First bid
      const firstBidAmount = ethers.parseEther("2");
      await auction.connect(bidder1).bid(1, 0, { value: firstBidAmount });

      // Check bidder1 balance before second bid
      const bidder1BalanceBefore = await ethers.provider.getBalance(bidder1.address);

      // Second bid (must be at least double)
      const secondBidAmount = ethers.parseEther("4");
      const tx = await auction.connect(bidder2).bid(1, 0, { value: secondBidAmount });

      // Check for refund event
      const receipt = await tx.wait();
      const refundEvent = receipt?.logs.find(log => {
        try {
          return auction.interface.parseLog(log)?.name === "BidRefunded";
        } catch (e) {
          return false;
        }
      });

      expect(refundEvent).to.not.be.undefined;
      const parsedRefundEvent = auction.interface.parseLog(refundEvent);
      expect(parsedRefundEvent?.args.auctionId).to.equal(1);
      expect(parsedRefundEvent?.args.previousBidder).to.equal(bidder1.address);
      expect(parsedRefundEvent?.args.amount).to.equal(firstBidAmount);

      // Check bidder1 balance after refund
      const bidder1BalanceAfter = await ethers.provider.getBalance(bidder1.address);
      expect(bidder1BalanceAfter - bidder1BalanceBefore).to.equal(firstBidAmount);
    });

    it("Should require bid to be at least double the highest bid", async function () {
      const { auction, creator, bidder1, bidder2 } = await loadFixture(deployAuctionFixture);

      // Create auction
      await auction.connect(creator).createAuction(
        "Native Auction",
        "Test Description",
        "QmTest123",
        ethers.parseEther("1"),
        24,
        false,
        ethers.ZeroAddress
      );

      // First bid
      await auction.connect(bidder1).bid(1, 0, { value: ethers.parseEther("2") });

      // Second bid too low
      await expect(auction.connect(bidder2).bid(1, 0, { value: ethers.parseEther("3") }))
        .to.be.revertedWith("Bid must be at least double the highest bid");

      // Second bid correct
      await expect(auction.connect(bidder2).bid(1, 0, { value: ethers.parseEther("4") }))
        .to.not.be.reverted;
    });
  });

  describe("End Auction", function () {
    it("Should end auction and distribute funds correctly", async function () {
      const { auction, owner, creator, bidder1 } = await loadFixture(deployAuctionFixture);

      // Create auction
      await auction.connect(creator).createAuction(
        "Native Auction",
        "Test Description",
        "QmTest123",
        ethers.parseEther("1"),
        24,
        false,
        ethers.ZeroAddress
      );

      // Place bid
      const bidAmount = ethers.parseEther("2");
      await auction.connect(bidder1).bid(1, 0, { value: bidAmount });

      // Check balances before ending auction
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      const creatorBalanceBefore = await ethers.provider.getBalance(creator.address);

      // End auction
      await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]); // 24 hours
      await ethers.provider.send("evm_mine", []);
      const tx = await auction.endAuction(1);
      await tx.wait();

      // Check auction status
      const auctionInfo = await auction.getAuction(1);
      expect(auctionInfo[9]).to.be.true; // ended

      // Check balances after ending auction
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      const creatorBalanceAfter = await ethers.provider.getBalance(creator.address);

      // Platform fee should be 2.5% of bid amount
      const expectedPlatformFee = bidAmount * 250n / 10000n;
      const expectedCreatorAmount = bidAmount - expectedPlatformFee;

      // Menggunakan approximately equal karena mungkin ada perbedaan kecil karena gas
      expect(ownerBalanceAfter - ownerBalanceBefore).to.be.closeTo(expectedPlatformFee, ethers.parseEther("0.01"));
      expect(creatorBalanceAfter - creatorBalanceBefore).to.be.closeTo(expectedCreatorAmount, ethers.parseEther("0.01"));
    });

    it("Should not allow ending an auction twice", async function () {
      const { auction, creator, bidder1 } = await loadFixture(deployAuctionFixture);

      // Create and bid on auction
      await auction.connect(creator).createAuction(
        "Test Auction",
        "Description",
        "QmTest",
        ethers.parseEther("1"),
        24,
        false,
        ethers.ZeroAddress
      );
      await auction.connect(bidder1).bid(1, 0, { value: ethers.parseEther("2") });

      // End auction
      await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);
      await auction.endAuction(1);

      // Try to end again
      await expect(auction.endAuction(1)).to.be.revertedWith("Auction already ended");
    });
  });

  describe("View Functions", function () {
    it("Should return correct auction information", async function () {
      const { auction, creator, mockToken } = await loadFixture(deployAuctionFixture);

      // Create auction
      await auction.connect(creator).createAuction(
        "View Test Auction",
        "Test Description",
        "QmTestView",
        ethers.parseEther("5"),
        48,
        true,
        mockToken.target
      );

      const auctionInfo = await auction.getAuction(1);
      expect(auctionInfo[0]).to.equal(1); // id
      expect(auctionInfo[1]).to.equal(creator.address); // creator
      expect(auctionInfo[2]).to.equal("View Test Auction"); // title
      expect(auctionInfo[3]).to.equal("Test Description"); // description
      expect(auctionInfo[4]).to.equal("QmTestView"); // ipfsHash
      expect(auctionInfo[5]).to.equal(ethers.parseEther("5")); // startPrice
      expect(auctionInfo[10]).to.be.true; // isERC20
      expect(auctionInfo[11]).to.equal(mockToken.target); // tokenAddress
    });

    it("Should return all auctions", async function () {
      const { auction, creator } = await loadFixture(deployAuctionFixture);

      // Create multiple auctions
      await auction.connect(creator).createAuction(
        "Auction 1",
        "Description 1",
        "QmTest1",
        ethers.parseEther("1"),
        24,
        false,
        ethers.ZeroAddress
      );

      await auction.connect(creator).createAuction(
        "Auction 2",
        "Description 2",
        "QmTest2",
        ethers.parseEther("2"),
        48,
        false,
        ethers.ZeroAddress
      );

      const allAuctions = await auction.getAllAuctions();
      expect(allAuctions.length).to.equal(2);
      expect(allAuctions[0].title).to.equal("Auction 1");
      expect(allAuctions[1].title).to.equal("Auction 2");
    });

    it("Should return user bid history", async function () {
      const { auction, creator, bidder1 } = await loadFixture(deployAuctionFixture);

      // Create auction
      await auction.connect(creator).createAuction(
        "Bid History Test",
        "Description",
        "QmTestBid",
        ethers.parseEther("1"),
        24,
        false,
        ethers.ZeroAddress
      );

      // Place multiple bids
      await auction.connect(bidder1).bid(1, 0, { value: ethers.parseEther("2") });

      // Get bid history
      const bidHistory = await auction.getUserBidHistory(bidder1.address, 1);
      expect(bidHistory.length).to.equal(1);
      expect(bidHistory[0]).to.equal(ethers.parseEther("2"));
    });
  });
});