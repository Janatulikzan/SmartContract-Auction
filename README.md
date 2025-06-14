# **DApp Lelang Terdesentralisasi (Monad)**  

Smart contract berbasis **Solidity** untuk jaringan **Monad** (EVM-compatible) yang mengelola sistem lelang terdesentralisasi.

## **Fitur Utama**
✅ Pembayaran menggunakan **token MON** (native) atau **ERC20** lainnya  
✅ Biaya platform **2.5%**  
✅ **Gambar item** disimpan melalui **hash IPFS**  
✅ **Durasi lelang** dalam satuan jam  
✅ **Kenaikan nilai bid** eksponensial (**dikali 2** setiap bid baru)  
✅ **Refund otomatis** untuk penawar sebelumnya  

## **Struktur Proyek**

```
├── contracts/
│   ├── DecentralizedAuction.sol  # Kontrak utama lelang
│   └── MockERC20.sol             # Kontrak ERC20 untuk testing
├── test/
│   └── DecentralizedAuction.ts   # Test untuk kontrak lelang
└── ignition/
    └── modules/
        └── DecentralizedAuction.ts # Script deployment
```


## **Teknologi yang Digunakan**
- **Solidity** 0.8.28  
- **Hardhat**  
- **OpenZeppelin Contracts**  
- **Hardhat Ignition** (untuk deployment)  

## **Instalasi**
```bash
# Clone repository
git clone <repository-url>
cd smart-contract

# Install dependencies
npm install

```

## Testing

```bash
npx hardhat test
```

## Deployment

```bash
# Compile contracts
npx hardhat compile

# Deploy ke jaringan lokal
npx hardhat ignition deploy ignition/modules/DecentralizedAuction.ts --parameters '{"platformFeeAddress": "YOUR_PLATFORM_FEE_ADDRESS"}'

# Deploy ke jaringan Monad (perlu konfigurasi tambahan di hardhat.config.ts)
npx hardhat ignition deploy ignition/modules/DecentralizedAuction.ts --network monad --parameters '{"platformFeeAddress": "YOUR_PLATFORM_FEE_ADDRESS"}'
```

## **Fungsi Utama**

### **Pembuatan Lelang**

```solidity
function createAuction(
    string memory _title,
    string memory _description,
    string memory _ipfsHash,
    uint256 _startPrice,
    uint256 _durasiJam,
    bool _isERC20,
    address _tokenAddress
) public returns (uint256)
```

### **Bidding**

```solidity
function bid(uint256 _auctionId, uint256 _amount) public payable
```

### **Mengakhiri Lelang**

```solidity
function endAuction(uint256 _auctionId) public
```

### **Fungsi View**

```solidity
function getAuction(uint256 _auctionId) public view returns (...)
function getAllAuctions() public view returns (AuctionInfo[] memory)
function getUserBidHistory(address _user, uint256 _auctionId) public view returns (uint256[] memory)
function getCurrentHighestBid(uint256 _auctionId) public view returns (address, uint256)
```

## **Lisensi**

MIT
#   S m a r t C o n t r a c t - A u c t i o n 
 
 
