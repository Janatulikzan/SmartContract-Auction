import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DecentralizedAuctionModule = buildModule("DecentralizedAuctionModule", (m) => {
  // Deploy DecentralizedAuction contract
  // Parameter: platformFeeAddress - alamat untuk menerima fee platform (2.5%)
  // Menggunakan string untuk menghindari masalah dengan ukuran integer
  const platformFeeAddress = m.getParameter<string>("platformFeeAddress", "0x1234567890123456789012345678901234567890");
  
  const decentralizedAuction = m.contract("DecentralizedAuction", [
    platformFeeAddress, // Alamat untuk menerima fee platform
  ]);

  return { decentralizedAuction };
});

export default DecentralizedAuctionModule;