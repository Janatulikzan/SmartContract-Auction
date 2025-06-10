// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
/**
 * @title DecentralizedAuction
 * @dev Smart contract untuk sistem lelang terdesentralisasi di jaringan Monad
 */
contract DecentralizedAuction is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Konstanta
    uint256 public constant PLATFORM_FEE_BASIS_POINTS = 250; // 2.5%
    uint256 public constant BASIS_POINTS_DIVISOR = 10000; // 100%

    // Variabel state
    address public platformFeeAddress;
    uint256 private auctionIdCounter;

    // Struktur data untuk lelang
    struct AuctionInfo {
        uint256 id;
        address creator;
        string title;
        string description;
        string ipfsHash;
        uint256 startPrice;
        uint256 highestBid;
        address highestBidder;
        uint256 endTime;
        bool ended;
        bool isERC20;
        address tokenAddress;
    }

    // Mapping untuk menyimpan data lelang
    mapping(uint256 => AuctionInfo) private auctions;
    // Mapping untuk menyimpan riwayat bid per user per lelang
    mapping(uint256 => mapping(address => uint256[])) private bidHistories;
    // Mapping untuk menyimpan bid per user per lelang
    mapping(uint256 => mapping(address => uint256)) private bids;
    // Array untuk menyimpan semua ID lelang
    uint256[] private auctionIds;

    // Events
    event AuctionCreated(
        uint256 indexed auctionId,
        address indexed creator,
        string title,
        string ipfsHash,
        uint256 startPrice,
        uint256 endTime,
        bool isERC20,
        address tokenAddress
    );

    event NewBid(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 amount
    );

    event AuctionEnded(
        uint256 indexed auctionId,
        address indexed winner,
        uint256 amount
    );

    event BidRefunded(
        uint256 indexed auctionId,
        address indexed previousBidder,
        uint256 amount
    );

    /**
     * @dev Constructor untuk menginisialisasi alamat fee platform
     * @param _platformFeeAddress Alamat untuk menerima fee platform
     */
    constructor(address _platformFeeAddress) {
        require(_platformFeeAddress != address(0), "Invalid platform fee address");
        platformFeeAddress = _platformFeeAddress;
        auctionIdCounter = 1; // Mulai dari 1 untuk menghindari ID 0
    }

    /**
     * @dev Fungsi untuk membuat lelang baru
     * @param _title Judul lelang
     * @param _description Deskripsi lelang
     * @param _ipfsHash Hash IPFS gambar item
     * @param _startPrice Harga awal lelang
     * @param _durasiJam Durasi lelang dalam jam
     * @param _isERC20 Apakah menggunakan token ERC20
     * @param _tokenAddress Alamat token ERC20 (jika _isERC20 == true)
     * @return ID lelang baru
     */
    function createAuction(
        string memory _title,
        string memory _description,
        string memory _ipfsHash,
        uint256 _startPrice,
        uint256 _durasiJam,
        bool _isERC20,
        address _tokenAddress
    ) public returns (uint256) {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_ipfsHash).length > 0, "IPFS hash cannot be empty");
        require(_startPrice > 0, "Start price must be greater than 0");
        require(_durasiJam > 0, "Duration must be greater than 0");
        
        if (_isERC20) {
            require(_tokenAddress != address(0), "Token address cannot be zero address");
        }

        uint256 newAuctionId = auctionIdCounter;
        auctionIdCounter++;

        auctions[newAuctionId] = AuctionInfo({
            id: newAuctionId,
            creator: msg.sender,
            title: _title,
            description: _description,
            ipfsHash: _ipfsHash,
            startPrice: _startPrice,
            highestBid: 0,
            highestBidder: address(0),
            endTime: block.timestamp + (_durasiJam * 1 hours),
            ended: false,
            isERC20: _isERC20,
            tokenAddress: _tokenAddress
        });

        auctionIds.push(newAuctionId);

        emit AuctionCreated(
            newAuctionId,
            msg.sender,
            _title,
            _ipfsHash,
            _startPrice,
            block.timestamp + (_durasiJam * 1 hours),
            _isERC20,
            _tokenAddress
        );

        return newAuctionId;
    }

    /**
     * @dev Fungsi untuk memasukkan bid pada lelang
     * @param _auctionId ID lelang
     * @param _amount Jumlah bid (hanya untuk ERC20)
     */
    function bid(uint256 _auctionId, uint256 _amount) public payable nonReentrant {
        AuctionInfo storage auction = auctions[_auctionId];
        require(auction.id == _auctionId, "Auction does not exist");
        require(!auction.ended, "Auction already ended");
        require(block.timestamp < auction.endTime, "Auction already expired");
        require(msg.sender != auction.creator, "Creator cannot bid on own auction");

        uint256 bidAmount;

        if (auction.isERC20) {
            require(msg.value == 0, "ETH not accepted for ERC20 auction");
            require(_amount > 0, "Bid amount must be greater than 0");
            bidAmount = _amount;

            // Validasi jumlah bid
            if (auction.highestBid == 0) {
                require(bidAmount >= auction.startPrice, "Bid must be at least the start price");
            } else {
                require(bidAmount >= auction.highestBid * 2, "Bid must be at least double the highest bid");
            }

            // Transfer token dari bidder ke kontrak
            IERC20(auction.tokenAddress).safeTransferFrom(msg.sender, address(this), bidAmount);

            // Refund previous bidder
            if (auction.highestBidder != address(0)) {
                uint256 previousBid = auction.highestBid;
                IERC20(auction.tokenAddress).safeTransfer(auction.highestBidder, previousBid);
                emit BidRefunded(_auctionId, auction.highestBidder, previousBid);
            }
        } else {
            require(msg.value > 0, "Bid amount must be greater than 0");
            require(_amount == 0, "Amount parameter should be 0 for native token");
            bidAmount = msg.value;

            // Validasi jumlah bid
            if (auction.highestBid == 0) {
                require(bidAmount >= auction.startPrice, "Bid must be at least the start price");
            } else {
                require(bidAmount >= auction.highestBid * 2, "Bid must be at least double the highest bid");
            }

            // Refund previous bidder
            if (auction.highestBidder != address(0)) {
                uint256 previousBid = auction.highestBid;
                payable(auction.highestBidder).transfer(previousBid);
                emit BidRefunded(_auctionId, auction.highestBidder, previousBid);
            }
        }

        // Update data lelang
        auction.highestBid = bidAmount;
        auction.highestBidder = msg.sender;

        // Simpan bid dalam riwayat
        bidHistories[_auctionId][msg.sender].push(bidAmount);
        bids[_auctionId][msg.sender] = bidAmount;

        emit NewBid(_auctionId, msg.sender, bidAmount);
    }

    /**
     * @dev Fungsi untuk mengakhiri lelang
     * @param _auctionId ID lelang
     */
    function endAuction(uint256 _auctionId) public nonReentrant {
        AuctionInfo storage auction = auctions[_auctionId];
        require(auction.id == _auctionId, "Auction does not exist");
        require(!auction.ended, "Auction already ended");
        require(
            block.timestamp >= auction.endTime || msg.sender == auction.creator,
            "Auction not yet expired or caller is not the creator"
        );

        auction.ended = true;

        // Jika tidak ada penawar, tidak ada transfer yang dilakukan
        if (auction.highestBidder == address(0)) {
            emit AuctionEnded(_auctionId, address(0), 0);
            return;
        }

        uint256 highestBid = auction.highestBid;
        uint256 platformFee = (highestBid * PLATFORM_FEE_BASIS_POINTS) / BASIS_POINTS_DIVISOR;
        uint256 sellerAmount = highestBid - platformFee;

        if (auction.isERC20) {
            // Transfer fee ke platform
            IERC20(auction.tokenAddress).safeTransfer(platformFeeAddress, platformFee);
            // Transfer sisa ke penjual
            IERC20(auction.tokenAddress).safeTransfer(auction.creator, sellerAmount);
        } else {
            // Transfer fee ke platform
            payable(platformFeeAddress).transfer(platformFee);
            // Transfer sisa ke penjual
            payable(auction.creator).transfer(sellerAmount);
        }

        emit AuctionEnded(_auctionId, auction.highestBidder, highestBid);
    }

    // /**
    //  * @dev Fungsi untuk mendapatkan informasi lelang
    //  * @param _auctionId ID lelang
    //  * @return Informasi lelang
    //  */
    
    function getAuction(uint256 _auctionId) public view returns (
        uint256 id,
        address creator,
        string memory title,
        string memory description,
        string memory ipfsHash,
        uint256 startPrice,
        uint256 highestBid,
        address highestBidder,
        uint256 endTime,
        bool ended,
        bool isERC20,
        address tokenAddress
    ) {
        AuctionInfo storage auction = auctions[_auctionId];
        require(auction.id == _auctionId, "Auction does not exist");

        return (
            auction.id,
            auction.creator,
            auction.title,
            auction.description,
            auction.ipfsHash,
            auction.startPrice,
            auction.highestBid,
            auction.highestBidder,
            auction.endTime,
            auction.ended,
            auction.isERC20,
            auction.tokenAddress
        );
    }

    /**
     * @dev Fungsi untuk mendapatkan semua lelang
     * @return Array dari informasi lelang
     */
    function getAllAuctions() public view returns (AuctionInfo[] memory) {
        AuctionInfo[] memory allAuctions = new AuctionInfo[](auctionIds.length);

        for (uint256 i = 0; i < auctionIds.length; i++) {
            uint256 auctionId = auctionIds[i];
            AuctionInfo storage auction = auctions[auctionId];
            allAuctions[i] = auction;
        }

        return allAuctions;
    }

    /**
     * @dev Fungsi untuk mendapatkan riwayat bid pengguna pada lelang tertentu
     * @param _user Alamat pengguna
     * @param _auctionId ID lelang
     * @return Array dari jumlah bid
     */
    function getUserBidHistory(address _user, uint256 _auctionId) public view returns (uint256[] memory) {
        return bidHistories[_auctionId][_user];
    }

    /**
     * @dev Fungsi untuk mendapatkan bid tertinggi saat ini pada lelang tertentu
     * @param _auctionId ID lelang
     * @return Alamat penawar tertinggi dan jumlah bid
     */
    function getCurrentHighestBid(uint256 _auctionId) public view returns (address, uint256) {
        AuctionInfo storage auction = auctions[_auctionId];
        require(auction.id == _auctionId, "Auction does not exist");

        return (auction.highestBidder, auction.highestBid);
    }

    /**
     * @dev Fungsi untuk mengubah alamat fee platform (hanya owner)
     * @param _newPlatformFeeAddress Alamat fee platform baru
     */
    function setPlatformFeeAddress(address _newPlatformFeeAddress) public {
        require(msg.sender == platformFeeAddress, "Only platform fee address can change itself");
        require(_newPlatformFeeAddress != address(0), "Invalid platform fee address");
        platformFeeAddress = _newPlatformFeeAddress;
    }
}