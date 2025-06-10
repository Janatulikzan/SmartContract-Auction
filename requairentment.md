Smart Contract Requirements: DApp Lelang Terdesentralisasi (Monad)
📌 Deskripsi Umum:
Bangun smart contract berbasis Solidity untuk jaringan Monad (EVM-compatible) yang mengelola sistem lelang terdesentralisasi dengan dukungan:

Pembayaran menggunakan token MON atau token ERC20 lainnya

Biaya platform 2.5%

Gambar item melalui hash IPFS

Durasi lelang dalam jam

Kenaikan nilai bid eksponensial (dikali 2 setiap bid baru)

🎯 Fitur Utama:
🧱 1. Pembuatan Lelang
Fungsi untuk membuat lelang baru oleh pengguna:

Input:

judul: string

deskripsi: string

ipfsHash: string (hash IPFS gambar item)

startPrice: uint256

durasiJam: uint256

isERC20: bool

tokenAddress: input address token (wajib jika isERC20 == true)

Output:

ID lelang baru

Emit event AuctionCreated

⚙️ 2. Bidding
Fungsi untuk memasukkan bid pada lelang:

Input:

auctionId: uint256

amount: uint256 (hanya untuk ERC20)

Untuk MON: gunakan msg.value

Validasi:

Jika belum ada bid: bid >= startPrice

Jika sudah ada bid: bid >= highestBid * 2

Proses:

Simpan bid baru

Update highestBid dan highestBidder

Emit event NewBid

simpan riwayat bid agar dapat ditampilkan pada frontend

🏁 3. Mengakhiri Lelang
Fungsi untuk mengakhiri lelang jika waktu sudah habis:

Validasi:

block.timestamp >= endTime

Lelang belum diakhiri (!ended)

Proses:

Transfer 97.5% dari highestBid ke penjual

Transfer 2.5% ke alamat fee platform

Tandai lelang selesai (ended = true)

Emit event AuctionEnded

🪙 4. Sistem Pembayaran
Jika MON (native token):

Gunakan payable

Jika ERC20:

Gunakan IERC20(token).transferFrom(bidder, contract, amount)

Gunakan SafeERC20 OpenZeppelin

Refund: transfer token atau native kembali ke penawar sebelumnya saat lelang telah berakhir

💵 5. Fee Platform
Fee platform = 2.5% (konstanta 250 basis points)

Ditransfer ke platformFeeAddress saat lelang selesai

🔒 6. Keamanan
Gunakan:

ReentrancyGuard

SafeERC20 (untuk transfer token aman)

Validasi:

Tidak bisa bid jika lelang sudah berakhir

Tidak bisa membuat lelang dengan input tidak valid

📤 7. Event
AuctionCreated(auctionId, creator, ...)

NewBid(auctionId, bidder, amount)

AuctionEnded(auctionId, winner, amount)

BidRefunded(auctionId, previousBidder, amount)

📚 8. Fungsi View untuk Frontend
getAuction(uint256 id) → Auction

getAllAuctions() → Auction[]

getUserBidHistory(address user, uint256 auctionId) → uint256[]

getCurrentHighestBid(uint256 auctionId) → (address, uint256)

🧩 Struktur Data
solidity
Copy
Edit
struct Auction {
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
  mapping(address => uint256) bids;
}
🛠️ Fungsi yang Harus Dibuat
solidity
Copy
Edit
function createAuction(...): public
function bid(uint256 auctionId, uint256 amount) public payable
function endAuction(uint256 auctionId) public
function getAuction(uint256 auctionId) public view returns (...)
function getAllAuctions() public view returns (...)
function getUserBidHistory(address user, uint256 auctionId) public view returns (...)